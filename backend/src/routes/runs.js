import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { project_id, status, agent_id } = req.query;
    const conditions = [];
    const params = [];
    if (project_id) { conditions.push('r.project_id = ?'); params.push(project_id); }
    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (agent_id) { conditions.push('r.agent_id = ?'); params.push(agent_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const runs = db.prepare(`
      SELECT r.*, a.name as agent_name, p.name as project_name, c.title as card_title
      FROM runs r
      LEFT JOIN agents a ON r.agent_id = a.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN cards c ON r.card_id = c.id
      ${where}
      ORDER BY r.created_at DESC
    `).all(...params);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const run = db.prepare(`
      SELECT r.*, a.name as agent_name, p.name as project_name, c.title as card_title
      FROM runs r
      LEFT JOIN agents a ON r.agent_id = a.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN cards c ON r.card_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    const events = db.prepare('SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...run, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', (req, res) => {
  try {
    const db = getDb();
    const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    if (!['queued', 'running'].includes(run.status)) {
      return res.status(400).json({ error: `Cannot cancel a run with status: ${run.status}` });
    }
    db.prepare(`
      UPDATE runs SET status = 'cancelled', finished_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(req.params.id);
    db.prepare(`
      INSERT INTO run_events (id, run_id, event_type, message) VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, 'cancelled', 'Run cancelled by user');
    const updated = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
