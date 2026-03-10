import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';

const router = Router();

const AgentCreateSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  execution_mode: z.enum(['provider', 'runtime']).default('provider'),
  provider_config_id: z.string().optional().nullable(),
  runtime_config_id: z.string().optional().nullable(),
  fallback_provider_config_id: z.string().optional().nullable(),
  system_prompt: z.string().max(8000).optional().nullable(),
  monthly_budget_usd: z.number().positive().optional().nullable(),
});

const AgentUpdateSchema = AgentCreateSchema.partial().omit({ workspace_id: true });

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
    const parsed = AgentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd } = parsed.data;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO agents (id, workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, provider_config_id || null, runtime_config_id || null, execution_mode || 'provider', fallback_provider_config_id || null, system_prompt || null, monthly_budget_usd ?? null);
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
    const parsed = AgentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd } = parsed.data;
    db.prepare(`
      UPDATE agents SET
        name = ?, description = ?, provider_config_id = ?, runtime_config_id = ?,
        execution_mode = ?, fallback_provider_config_id = ?, system_prompt = ?,
        monthly_budget_usd = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      provider_config_id !== undefined ? (provider_config_id || null) : existing.provider_config_id,
      runtime_config_id !== undefined ? (runtime_config_id || null) : existing.runtime_config_id,
      execution_mode ?? existing.execution_mode,
      fallback_provider_config_id !== undefined ? (fallback_provider_config_id || null) : existing.fallback_provider_config_id,
      system_prompt !== undefined ? (system_prompt || null) : existing.system_prompt,
      monthly_budget_usd !== undefined ? (monthly_budget_usd ?? null) : existing.monthly_budget_usd,
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

// --- Agent Memories ---

// List memories for an agent
router.get('/:id/memories', (req, res) => {
  try {
    const db = getDb();
    const { session_id } = req.query;
    let query = 'SELECT * FROM agent_memories WHERE agent_id = ?';
    const params = [req.params.id];
    if (session_id) { query += ' AND session_id = ?'; params.push(session_id); }
    query += ' ORDER BY importance DESC, updated_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add memory
router.post('/:id/memories', (req, res) => {
  try {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const { memory_key, content, session_id, importance } = req.body;
    if (!memory_key || !content) return res.status(400).json({ error: 'memory_key and content are required' });
    const memId = uuidv4();
    // Upsert by key+agent
    const existing = db.prepare('SELECT id FROM agent_memories WHERE agent_id = ? AND memory_key = ?').get(req.params.id, memory_key);
    if (existing) {
      db.prepare(`UPDATE agent_memories SET content = ?, importance = ?, session_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
        content, importance ?? 1, session_id || null, existing.id
      );
      return res.json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(existing.id));
    }
    db.prepare(`
      INSERT INTO agent_memories (id, agent_id, workspace_id, memory_key, content, session_id, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memId, req.params.id, agent.workspace_id, memory_key, content, session_id || null, importance ?? 1);
    res.status(201).json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(memId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update memory
router.put('/:id/memories/:memId', (req, res) => {
  try {
    const db = getDb();
    const mem = db.prepare('SELECT * FROM agent_memories WHERE id = ? AND agent_id = ?').get(req.params.memId, req.params.id);
    if (!mem) return res.status(404).json({ error: 'Memory not found' });
    const { memory_key, content, importance } = req.body;
    db.prepare(`UPDATE agent_memories SET memory_key = ?, content = ?, importance = ?, updated_at = datetime('now') WHERE id = ?`).run(
      memory_key ?? mem.memory_key, content ?? mem.content, importance ?? mem.importance, req.params.memId
    );
    res.json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(req.params.memId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete memory
router.delete('/:id/memories/:memId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM agent_memories WHERE id = ? AND agent_id = ?').run(req.params.memId, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
