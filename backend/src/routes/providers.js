import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';

const router = Router();

const PROVIDER_TYPES = ['openai', 'anthropic', 'google', 'openrouter', 'minimax', 'glm'];

const ProviderSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(100),
  provider_type: z.enum(PROVIDER_TYPES),
  base_url: z.string().url().optional().nullable().or(z.literal('')).transform(v => v || null),
  api_key_env_var: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  is_default: z.boolean().optional().default(false),
});

const ProviderUpdateSchema = ProviderSchema.partial().omit({ workspace_id: true });

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
    const parsed = ProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { workspace_id, name, provider_type, base_url, api_key_env_var, model, is_default } = parsed.data;
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
    const parsed = ProviderUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { name, provider_type, base_url, api_key_env_var, model, is_default } = parsed.data;
    if (is_default) {
      db.prepare(`UPDATE provider_configs SET is_default = 0 WHERE workspace_id = ?`).run(existing.workspace_id);
    }
    db.prepare(`
      UPDATE provider_configs SET name = ?, provider_type = ?, base_url = ?, api_key_env_var = ?, model = ?, is_default = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      provider_type ?? existing.provider_type,
      base_url !== undefined ? (base_url || null) : existing.base_url,
      api_key_env_var !== undefined ? (api_key_env_var || null) : existing.api_key_env_var,
      model !== undefined ? (model || null) : existing.model,
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
