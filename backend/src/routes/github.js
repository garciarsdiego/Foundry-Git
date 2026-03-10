import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// GitHub connections CRUD
router.get('/connections', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM github_connections';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    const connections = db.prepare(query).all(...params);
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/connections', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, access_token_env_var, installation_id, app_id, is_default } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    if (is_default) {
      db.prepare(`UPDATE github_connections SET is_default = 0 WHERE workspace_id = ?`).run(workspace_id);
    }
    db.prepare(`
      INSERT INTO github_connections (id, workspace_id, name, access_token_env_var, installation_id, app_id, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, access_token_env_var || null, installation_id || null, app_id || null, is_default ? 1 : 0);
    const conn = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(id);
    res.status(201).json(conn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/connections/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });
    const { name, access_token_env_var, installation_id, app_id, is_default } = req.body;
    if (is_default) {
      db.prepare(`UPDATE github_connections SET is_default = 0 WHERE workspace_id = ?`).run(existing.workspace_id);
    }
    db.prepare(`
      UPDATE github_connections SET name = ?, access_token_env_var = ?, installation_id = ?, app_id = ?, is_default = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      access_token_env_var ?? existing.access_token_env_var,
      installation_id ?? existing.installation_id,
      app_id ?? existing.app_id,
      is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
      req.params.id
    );
    const conn = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(req.params.id);
    res.json(conn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/connections/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM github_connections WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync GitHub issues to cards (scaffold)
router.post('/sync/:projectId', async (req, res) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // TODO: Use Octokit to fetch issues from project.repo_owner/project.repo_name
    // For now, return a scaffold response
    res.json({
      message: 'GitHub issue sync scaffold - not yet connected to real API',
      project_id: req.params.projectId,
      repo: project.repo_owner && project.repo_name ? `${project.repo_owner}/${project.repo_name}` : null,
      synced: 0,
      todo: 'Configure GitHub connection and set repo_owner/repo_name on project'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List repos for a connection (scaffold)
router.get('/repos/:connectionId', async (req, res) => {
  try {
    const db = getDb();
    const conn = db.prepare('SELECT * FROM github_connections WHERE id = ?').get(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    // TODO: Use Octokit to list repos accessible with the token
    res.json({
      message: 'GitHub repo listing scaffold - not yet connected to real API',
      connection_id: req.params.connectionId,
      repos: [],
      todo: 'Set access_token_env_var on the connection and implement Octokit call'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
