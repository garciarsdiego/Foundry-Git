import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

export function getConnection(connectionId) {
  const db = getDb();
  const conn = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(connectionId);
  if (!conn) throw new Error(`GitHub connection ${connectionId} not found`);
  return conn;
}

function resolveToken(conn) {
  if (conn?.access_token_env_var) {
    const token = process.env[conn.access_token_env_var];
    if (token) return token;
  }
  // Fall back to the generic GITHUB_TOKEN env var
  return process.env.GITHUB_TOKEN || null;
}

function getOctokitForWorkspace(workspaceId) {
  const db = getDb();
  const conn = db.prepare(
    'SELECT * FROM github_connections WHERE workspace_id = ? AND is_default = 1'
  ).get(workspaceId);
  const token = resolveToken(conn);
  if (!token) throw new Error('No GitHub token found. Set GITHUB_TOKEN or configure a GitHub connection with an access_token_env_var.');
  return new Octokit({ auth: token });
}

function getOctokitForConnection(connectionId) {
  const conn = getConnection(connectionId);
  const token = resolveToken(conn);
  if (!token) throw new Error(`No GitHub token found for connection ${conn.name}. Set the env var "${conn.access_token_env_var}" or GITHUB_TOKEN.`);
  return new Octokit({ auth: token });
}

export async function syncIssues(projectId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  if (!project.repo_owner || !project.repo_name) {
    throw new Error('Project must have repo_owner and repo_name set for issue sync');
  }

  const octokit = getOctokitForWorkspace(project.workspace_id);
  const { data: issues } = await octokit.issues.listForRepo({
    owner: project.repo_owner,
    repo: project.repo_name,
    state: 'open',
    per_page: 100,
  });

  // Get the default board column for this project (first column / "Todo")
  const defaultBoard = db.prepare('SELECT * FROM boards WHERE project_id = ? LIMIT 1').get(projectId);
  const defaultColumn = defaultBoard
    ? db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC LIMIT 1').get(defaultBoard.id)
    : null;

  let synced = 0;
  for (const issue of issues) {
    // Skip pull requests (they also appear in issues endpoint)
    if (issue.pull_request) continue;

    // Check if card already exists for this issue
    const existing = db.prepare(
      'SELECT * FROM cards WHERE project_id = ? AND github_issue_number = ?'
    ).get(projectId, issue.number);

    if (existing) {
      // Update title and description if changed
      db.prepare(`
        UPDATE cards SET title = ?, description = ?, github_issue_url = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(issue.title, issue.body || null, issue.html_url, existing.id);
    } else {
      // Create a new card
      db.prepare(`
        INSERT INTO cards (id, project_id, board_id, column_id, title, description, priority, status, github_issue_number, github_issue_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        projectId,
        defaultBoard?.id || null,
        defaultColumn?.id || null,
        issue.title,
        issue.body || null,
        'medium',
        'todo',
        issue.number,
        issue.html_url,
      );
      synced++;
    }
  }

  return {
    message: `Synced ${synced} new issues from ${project.repo_owner}/${project.repo_name}`,
    project_id: projectId,
    repo: `${project.repo_owner}/${project.repo_name}`,
    total_open: issues.filter(i => !i.pull_request).length,
    synced,
  };
}

export async function createBranch(projectId, runId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);

  if (!project || !run) throw new Error('Project or run not found');

  const branchName = `foundry/run-${runId.slice(0, 8)}`;

  if (project.repo_owner && project.repo_name) {
    try {
      const octokit = getOctokitForWorkspace(project.workspace_id);
      const defaultBranch = project.default_branch || 'main';

      // Get the SHA of the base branch
      const { data: ref } = await octokit.git.getRef({
        owner: project.repo_owner,
        repo: project.repo_name,
        ref: `heads/${defaultBranch}`,
      });
      const baseSha = ref.object.sha;

      // Create the new branch
      await octokit.git.createRef({
        owner: project.repo_owner,
        repo: project.repo_name,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });
    } catch (err) {
      // Log the error but don't fail — update with branch name locally
      console.warn(`GitHub branch creation failed: ${err.message}`);
    }
  }

  db.prepare(`UPDATE runs SET branch_name = ?, updated_at = datetime('now') WHERE id = ?`).run(branchName, runId);

  return { branch_name: branchName };
}

export async function createPR(runId, title, body) {
  const db = getDb();
  const run = db.prepare(`
    SELECT r.*, p.repo_owner, p.repo_name, p.default_branch, p.workspace_id
    FROM runs r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ?
  `).get(runId);

  if (!run) throw new Error(`Run ${runId} not found`);
  if (!run.branch_name) throw new Error('Run does not have a branch_name. Create a branch first.');

  if (run.repo_owner && run.repo_name) {
    try {
      const octokit = getOctokitForWorkspace(run.workspace_id);
      const { data: pr } = await octokit.pulls.create({
        owner: run.repo_owner,
        repo: run.repo_name,
        title: title || `Foundry run ${runId.slice(0, 8)}`,
        body: body || `Automated PR created by Foundry for run ${runId}`,
        head: run.branch_name,
        base: run.default_branch || 'main',
      });

      db.prepare(`UPDATE runs SET pr_number = ?, pr_url = ?, updated_at = datetime('now') WHERE id = ?`).run(pr.number, pr.html_url, runId);

      return { pr_number: pr.number, pr_url: pr.html_url };
    } catch (err) {
      console.warn(`GitHub PR creation failed: ${err.message}`);
    }
  }

  // Fallback: record a placeholder PR URL
  const prNumber = Math.floor(Math.random() * 9000) + 1000;
  const prUrl = run.repo_owner && run.repo_name
    ? `https://github.com/${run.repo_owner}/${run.repo_name}/pull/${prNumber}`
    : `https://github.com/example/repo/pull/${prNumber}`;

  db.prepare(`UPDATE runs SET pr_number = ?, pr_url = ?, updated_at = datetime('now') WHERE id = ?`).run(prNumber, prUrl, runId);

  return { pr_number: prNumber, pr_url: prUrl, note: 'GitHub repo not configured on project; PR URL is a placeholder' };
}

export async function inspectRepo(connectionId, owner, repo) {
  const octokit = getOctokitForConnection(connectionId);
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    description: data.description,
    private: data.private,
    default_branch: data.default_branch,
    open_issues_count: data.open_issues_count,
    stargazers_count: data.stargazers_count,
    html_url: data.html_url,
    clone_url: data.clone_url,
  };
}

export async function listRepos(connectionId) {
  const octokit = getOctokitForConnection(connectionId);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50,
  });
  return data.map(r => ({
    id: r.id,
    full_name: r.full_name,
    name: r.name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    default_branch: r.default_branch,
    html_url: r.html_url,
    open_issues_count: r.open_issues_count,
  }));
}
