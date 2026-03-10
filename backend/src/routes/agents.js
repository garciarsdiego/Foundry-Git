import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = `
      SELECT a.*, p.name as provider_name, r.name as runtime_name
      FROM agents a
      LEFT JOIN provider_configs p ON a.provider_config_id = p.id
      LEFT JOIN runtime_configs r ON a.runtime_config_id = r.id
    `;
    const params = [];
    if (workspace_id) {
      query += ' WHERE a.workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY a.created_at DESC';
    const agents = db.prepare(query).all(...params);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO agents (id, workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, provider_config_id || null, runtime_config_id || null, execution_mode || 'provider', fallback_provider_config_id || null, system_prompt || null);
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    res.status(201).json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    const { name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt } = req.body;
    db.prepare(`
      UPDATE agents SET
        name = ?, description = ?, provider_config_id = ?, runtime_config_id = ?,
        execution_mode = ?, fallback_provider_config_id = ?, system_prompt = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      provider_config_id ?? existing.provider_config_id,
      runtime_config_id ?? existing.runtime_config_id,
      execution_mode ?? existing.execution_mode,
      fallback_provider_config_id ?? existing.fallback_provider_config_id,
      system_prompt ?? existing.system_prompt,
      req.params.id
    );
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
