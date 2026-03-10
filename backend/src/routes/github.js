import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { syncIssues, inspectRepo, listRepos, createBranch, createPR } from '../services/githubService.js';

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

// Sync GitHub issues to cards
router.post('/sync/:projectId', async (req, res) => {
  try {
    const result = await syncIssues(req.params.projectId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List repos for a connection
router.get('/repos/:connectionId', async (req, res) => {
  try {
    const repos = await listRepos(req.params.connectionId);
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inspect a specific repo
router.get('/repos/:connectionId/:owner/:repo', async (req, res) => {
  try {
    const { connectionId, owner, repo } = req.params;
    const data = await inspectRepo(connectionId, owner, repo);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create branch for a run
router.post('/branch/:projectId/:runId', async (req, res) => {
  try {
    const result = await createBranch(req.params.projectId, req.params.runId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create PR for a run
router.post('/pr/:runId', async (req, res) => {
  try {
    const { title, body } = req.body;
    const result = await createPR(req.params.runId, title, body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
