import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM runtime_configs';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    const runtimes = db.prepare(query).all(...params);
    res.json(runtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const runtime = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(req.params.id);
    if (!runtime) return res.status(404).json({ error: 'Runtime config not found' });
    res.json(runtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, runtime_type, binary_path, extra_args, is_default } = req.body;
    if (!workspace_id || !name || !runtime_type) {
      return res.status(400).json({ error: 'workspace_id, name, and runtime_type are required' });
    }
    const id = uuidv4();
    if (is_default) {
      db.prepare(`UPDATE runtime_configs SET is_default = 0 WHERE workspace_id = ?`).run(workspace_id);
    }
    db.prepare(`
      INSERT INTO runtime_configs (id, workspace_id, name, runtime_type, binary_path, extra_args, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, runtime_type, binary_path || null, extra_args || null, is_default ? 1 : 0);
    const runtime = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(id);
    res.status(201).json(runtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Runtime config not found' });
    const { name, runtime_type, binary_path, extra_args, is_default } = req.body;
    if (is_default) {
      db.prepare(`UPDATE runtime_configs SET is_default = 0 WHERE workspace_id = ?`).run(existing.workspace_id);
    }
    db.prepare(`
      UPDATE runtime_configs SET name = ?, runtime_type = ?, binary_path = ?, extra_args = ?, is_default = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      runtime_type ?? existing.runtime_type,
      binary_path ?? existing.binary_path,
      extra_args ?? existing.extra_args,
      is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
      req.params.id
    );
    const runtime = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(req.params.id);
    res.json(runtime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM runtime_configs WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
