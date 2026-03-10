import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const workspaces = db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all();
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
    const id = uuidv4();
    db.prepare('INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, slug } = req.body;
    const existing = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workspace not found' });
    db.prepare(`
      UPDATE workspaces SET name = ?, slug = ?, updated_at = datetime('now') WHERE id = ?
    `).run(name ?? existing.name, slug ?? existing.slug, req.params.id);
    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workspace not found' });
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
