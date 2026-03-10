import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM skills';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    // Include agents using this skill
    const agents = db.prepare(`
      SELECT a.id, a.name, a.execution_mode FROM agent_skills asl
      JOIN agents a ON asl.agent_id = a.id
      WHERE asl.skill_id = ?
    `).all(req.params.id);
    res.json({ ...skill, agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description, skill_type, content, is_public } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO skills (id, workspace_id, name, description, skill_type, content, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, skill_type || 'system_prompt', content || null, is_public ? 1 : 0);
    res.status(201).json(db.prepare('SELECT * FROM skills WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const { name, description, skill_type, content, is_public } = req.body;
    db.prepare(`
      UPDATE skills SET name = ?, description = ?, skill_type = ?, content = ?, is_public = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? skill.name,
      description ?? skill.description,
      skill_type ?? skill.skill_type,
      content ?? skill.content,
      is_public !== undefined ? (is_public ? 1 : 0) : skill.is_public,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign skill to agent
router.post('/:id/agents', (req, res) => {
  try {
    const db = getDb();
    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
    db.prepare('INSERT OR IGNORE INTO agent_skills (id, agent_id, skill_id) VALUES (?, ?, ?)').run(uuidv4(), agent_id, req.params.id);
    res.status(201).json({ skill_id: req.params.id, agent_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove skill from agent
router.delete('/:id/agents/:agentId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM agent_skills WHERE skill_id = ? AND agent_id = ?').run(req.params.id, req.params.agentId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
