import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// Teams CRUD
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = `
      SELECT t.*, pt.name as parent_team_name, a.name as manager_agent_name,
             COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN teams pt ON t.parent_team_id = pt.id
      LEFT JOIN agents a ON t.manager_agent_id = a.id
      LEFT JOIN team_memberships tm ON tm.team_id = t.id
    `;
    const params = [];
    if (workspace_id) {
      query += ' WHERE t.workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const team = db.prepare(`
      SELECT t.*, pt.name as parent_team_name, a.name as manager_agent_name
      FROM teams t
      LEFT JOIN teams pt ON t.parent_team_id = pt.id
      LEFT JOIN agents a ON t.manager_agent_id = a.id
      WHERE t.id = ?
    `).get(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const members = db.prepare(`
      SELECT tm.*, a.name as agent_name, a.execution_mode
      FROM team_memberships tm
      JOIN agents a ON tm.agent_id = a.id
      WHERE tm.team_id = ?
    `).all(req.params.id);
    // Sub-teams (children)
    const subTeams = db.prepare('SELECT id, name, description FROM teams WHERE parent_team_id = ?').all(req.params.id);
    res.json({ ...team, members, sub_teams: subTeams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description, parent_team_id, manager_agent_id } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO teams (id, workspace_id, name, description, parent_team_id, manager_agent_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, parent_team_id || null, manager_agent_id || null);
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
    const { name, description, parent_team_id, manager_agent_id } = req.body;
    db.prepare(`
      UPDATE teams SET name = ?, description = ?, parent_team_id = ?, manager_agent_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      parent_team_id !== undefined ? (parent_team_id || null) : existing.parent_team_id,
      manager_agent_id !== undefined ? (manager_agent_id || null) : existing.manager_agent_id,
      req.params.id
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
    const { agent_id, role, title } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
    const id = uuidv4();
    db.prepare('INSERT INTO team_memberships (id, team_id, agent_id, role, title) VALUES (?, ?, ?, ?, ?)').run(
      id, req.params.id, agent_id, role || 'member', title || null
    );
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
