import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// Teams CRUD
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM teams';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    const teams = db.prepare(query).all(...params);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const members = db.prepare(`
      SELECT tm.*, a.name as agent_name, a.execution_mode
      FROM team_memberships tm
      JOIN agents a ON tm.agent_id = a.id
      WHERE tm.team_id = ?
    `).all(req.params.id);
    res.json({ ...team, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare('INSERT INTO teams (id, workspace_id, name, description) VALUES (?, ?, ?, ?)').run(id, workspace_id, name, description || null);
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Team not found' });
    const { name, description } = req.body;
    db.prepare(`UPDATE teams SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name ?? existing.name, description ?? existing.description, req.params.id
    );
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Team memberships
router.post('/:id/members', (req, res) => {
  try {
    const db = getDb();
    const { agent_id, role } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
    const id = uuidv4();
    db.prepare('INSERT INTO team_memberships (id, team_id, agent_id, role) VALUES (?, ?, ?, ?)').run(id, req.params.id, agent_id, role || 'member');
    const membership = db.prepare('SELECT * FROM team_memberships WHERE id = ?').get(id);
    res.status(201).json(membership);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/members/:agentId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM team_memberships WHERE team_id = ? AND agent_id = ?').run(req.params.id, req.params.agentId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project team assignments
router.post('/:id/projects', (req, res) => {
  try {
    const db = getDb();
    const { project_id } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id is required' });
    const id = uuidv4();
    db.prepare('INSERT INTO project_teams (id, project_id, team_id) VALUES (?, ?, ?)').run(id, project_id, req.params.id);
    res.status(201).json({ id, project_id, team_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/projects/:projectId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM project_teams WHERE team_id = ? AND project_id = ?').run(req.params.id, req.params.projectId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
