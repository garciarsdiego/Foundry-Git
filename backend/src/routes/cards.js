import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { createRun } from '../services/executionService.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { project_id, board_id, column_id } = req.query;
    const conditions = [];
    const params = [];
    if (project_id) { conditions.push('project_id = ?'); params.push(project_id); }
    if (board_id) { conditions.push('board_id = ?'); params.push(board_id); }
    if (column_id) { conditions.push('column_id = ?'); params.push(column_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const cards = db.prepare(`SELECT * FROM cards ${where} ORDER BY created_at DESC`).all(...params);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { project_id, board_id, column_id, title, description, status, priority, assignee_agent_id, github_issue_number, github_issue_url } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'project_id and title are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO cards (id, project_id, board_id, column_id, title, description, status, priority, assignee_agent_id, github_issue_number, github_issue_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project_id, board_id || null, column_id || null, title, description || null, status || 'todo', priority || 'medium', assignee_agent_id || null, github_issue_number || null, github_issue_url || null);
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Card not found' });
    const { title, description, status, priority, column_id, assignee_agent_id, github_issue_number, github_issue_url } = req.body;
    db.prepare(`
      UPDATE cards SET
        title = ?, description = ?, status = ?, priority = ?, column_id = ?,
        assignee_agent_id = ?, github_issue_number = ?, github_issue_url = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title ?? existing.title,
      description ?? existing.description,
      status ?? existing.status,
      priority ?? existing.priority,
      column_id ?? existing.column_id,
      assignee_agent_id ?? existing.assignee_agent_id,
      github_issue_number ?? existing.github_issue_number,
      github_issue_url ?? existing.github_issue_url,
      req.params.id
    );
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Card not found' });
    db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a run from a card
router.post('/:id/run', async (req, res) => {
  try {
    const db = getDb();
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const agentId = req.body.agent_id || card.assignee_agent_id;
    if (!agentId) return res.status(400).json({ error: 'agent_id is required (or set assignee on card)' });

    const run = await createRun(req.params.id, agentId, req.body);
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
