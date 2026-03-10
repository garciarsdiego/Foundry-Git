import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM projects';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    const projects = db.prepare(query).all(...params);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, slug, description, repo_url, repo_owner, repo_name, default_branch } = req.body;
    if (!workspace_id || !name || !slug) {
      return res.status(400).json({ error: 'workspace_id, name, and slug are required' });
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, workspace_id, name, slug, description, repo_url, repo_owner, repo_name, default_branch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, slug, description || null, repo_url || null, repo_owner || null, repo_name || null, default_branch || 'main');
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    const { name, slug, description, repo_url, repo_owner, repo_name, default_branch } = req.body;
    db.prepare(`
      UPDATE projects SET
        name = ?, slug = ?, description = ?, repo_url = ?, repo_owner = ?, repo_name = ?, default_branch = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      slug ?? existing.slug,
      description ?? existing.description,
      repo_url ?? existing.repo_url,
      repo_owner ?? existing.repo_owner,
      repo_name ?? existing.repo_name,
      default_branch ?? existing.default_branch,
      req.params.id
    );
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
