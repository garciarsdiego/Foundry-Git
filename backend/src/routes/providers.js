import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM provider_configs';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    const providers = db.prepare(query).all(...params);
    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const provider = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(req.params.id);
    if (!provider) return res.status(404).json({ error: 'Provider config not found' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, provider_type, base_url, api_key_env_var, model, is_default } = req.body;
    if (!workspace_id || !name || !provider_type) {
      return res.status(400).json({ error: 'workspace_id, name, and provider_type are required' });
    }
    const id = uuidv4();
    if (is_default) {
      db.prepare(`UPDATE provider_configs SET is_default = 0 WHERE workspace_id = ?`).run(workspace_id);
    }
    db.prepare(`
      INSERT INTO provider_configs (id, workspace_id, name, provider_type, base_url, api_key_env_var, model, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, provider_type, base_url || null, api_key_env_var || null, model || null, is_default ? 1 : 0);
    const provider = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(id);
    res.status(201).json(provider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Provider config not found' });
    const { name, provider_type, base_url, api_key_env_var, model, is_default } = req.body;
    if (is_default) {
      db.prepare(`UPDATE provider_configs SET is_default = 0 WHERE workspace_id = ?`).run(existing.workspace_id);
    }
    db.prepare(`
      UPDATE provider_configs SET name = ?, provider_type = ?, base_url = ?, api_key_env_var = ?, model = ?, is_default = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      provider_type ?? existing.provider_type,
      base_url ?? existing.base_url,
      api_key_env_var ?? existing.api_key_env_var,
      model ?? existing.model,
      is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
      req.params.id
    );
    const provider = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(req.params.id);
    res.json(provider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM provider_configs WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
