import { getDb } from '../db/index.js';

export function getConnection(connectionId) {
  const db = getDb();
  const conn = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(connectionId);
  if (!conn) throw new Error(`GitHub connection ${connectionId} not found`);
  return conn;
}

export async function syncIssues(projectId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  if (!project.repo_owner || !project.repo_name) {
    throw new Error('Project must have repo_owner and repo_name set for issue sync');
  }

  // TODO: Implement real GitHub issue sync using Octokit
  // const conn = db.prepare('SELECT * FROM github_connections WHERE workspace_id = ? AND is_default = 1').get(project.workspace_id);
  // const token = process.env[conn.access_token_env_var];
  // const octokit = new Octokit({ auth: token });
  // const { data: issues } = await octokit.issues.listForRepo({ owner: project.repo_owner, repo: project.repo_name });
  // for (const issue of issues) { ... create/update cards ... }

  return {
    message: 'GitHub issue sync scaffold - real API integration pending',
    project_id: projectId,
    repo: `${project.repo_owner}/${project.repo_name}`,
    synced: 0,
  };
}

export async function createBranch(projectId, runId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);

  if (!project || !run) throw new Error('Project or run not found');

  const branchName = `foundry/run-${runId.slice(0, 8)}`;

  // TODO: Use Octokit to create the branch on the real repo
  // const octokit = getOctokit(project.workspace_id);
  // await octokit.git.createRef({ owner: project.repo_owner, repo: project.repo_name, ref: `refs/heads/${branchName}`, sha: baseSha });

  db.prepare(`UPDATE runs SET branch_name = ?, updated_at = datetime('now') WHERE id = ?`).run(branchName, runId);

  return { branch_name: branchName, scaffold: true };
}

export async function createPR(runId, title, body) {
  const db = getDb();
  const run = db.prepare(`
    SELECT r.*, p.repo_owner, p.repo_name
    FROM runs r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ?
  `).get(runId);

  if (!run) throw new Error(`Run ${runId} not found`);

  // TODO: Use Octokit to create a real PR
  // const octokit = getOctokit(run.workspace_id);
  // const { data: pr } = await octokit.pulls.create({ ... });

  const mockPrNumber = Math.floor(Math.random() * 1000) + 1;
  const mockPrUrl = run.repo_owner && run.repo_name
    ? `https://github.com/${run.repo_owner}/${run.repo_name}/pull/${mockPrNumber}`
    : `https://github.com/example/repo/pull/${mockPrNumber}`;

  db.prepare(`UPDATE runs SET pr_number = ?, pr_url = ?, updated_at = datetime('now') WHERE id = ?`).run(mockPrNumber, mockPrUrl, runId);

  return { pr_number: mockPrNumber, pr_url: mockPrUrl, scaffold: true };
}

export async function inspectRepo(connectionId, owner, repo) {
  // TODO: Use Octokit to inspect repo
  // const conn = getConnection(connectionId);
  // const token = process.env[conn.access_token_env_var];
  // const octokit = new Octokit({ auth: token });
  // const { data } = await octokit.repos.get({ owner, repo });
  // return data;

  return {
    message: 'Repository inspection scaffold - real API integration pending',
    connection_id: connectionId,
    owner,
    repo,
    scaffold: true,
  };
}
