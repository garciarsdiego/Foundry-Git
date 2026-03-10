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

// SSE: stream run events in real-time
router.get('/:id/stream', (req, res) => {
  const db = getDb();
  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let lastEventId = 0;
  const TERMINAL = new Set(['success', 'failed', 'cancelled']);

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Send current run state immediately
  send({ type: 'run', run });

  // Send all existing events (use rowid for cursor tracking)
  const existing = db.prepare('SELECT rowid, * FROM run_events WHERE run_id = ? ORDER BY rowid ASC').all(req.params.id);
  for (const evt of existing) {
    send({ type: 'event', event: evt });
    if (evt.rowid > lastEventId) lastEventId = evt.rowid;
  }

  if (TERMINAL.has(run.status)) {
    send({ type: 'done', status: run.status });
    res.end();
    return;
  }

  // Poll for new events every 600ms
  const interval = setInterval(() => {
    try {
      const updatedRun = db.prepare('SELECT * FROM runs WHERE id = ?').get(req.params.id);
      if (!updatedRun) { clearInterval(interval); res.end(); return; }

      const newEvents = db.prepare(
        'SELECT rowid, * FROM run_events WHERE run_id = ? AND rowid > ? ORDER BY rowid ASC'
      ).all(req.params.id, lastEventId);

      for (const evt of newEvents) {
        send({ type: 'event', event: evt });
        lastEventId = evt.rowid;
      }

      if (updatedRun.status !== run.status || TERMINAL.has(updatedRun.status)) {
        send({ type: 'run', run: updatedRun });
      }

      if (TERMINAL.has(updatedRun.status)) {
        send({ type: 'done', status: updatedRun.status });
        clearInterval(interval);
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 600);

  req.on('close', () => clearInterval(interval));
});

// Cost and token usage stats
router.get('/stats/costs', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, agent_id, period } = req.query;

    // Determine the date cutoff based on period (default: current month)
    let since;
    if (period === '7d') {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === '30d') {
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Current calendar month
      const now = new Date();
      since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const conditions = ['r.created_at >= ?'];
    const params = [since];

    if (workspace_id) {
      conditions.push('p.workspace_id = ?');
      params.push(workspace_id);
    }
    if (agent_id) {
      conditions.push('r.agent_id = ?');
      params.push(agent_id);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const totals = db.prepare(`
      SELECT
        COUNT(*) as run_count,
        SUM(r.tokens_input) as total_tokens_input,
        SUM(r.tokens_output) as total_tokens_output,
        SUM(r.cost_usd) as total_cost_usd
      FROM runs r
      LEFT JOIN projects p ON r.project_id = p.id
      ${where}
    `).get(...params);

    const byAgent = db.prepare(`
      SELECT
        r.agent_id,
        a.name as agent_name,
        COUNT(*) as run_count,
        SUM(r.tokens_input) as tokens_input,
        SUM(r.tokens_output) as tokens_output,
        SUM(r.cost_usd) as cost_usd,
        a.monthly_budget_usd
      FROM runs r
      LEFT JOIN agents a ON r.agent_id = a.id
      LEFT JOIN projects p ON r.project_id = p.id
      ${where}
      GROUP BY r.agent_id
      ORDER BY cost_usd DESC
    `).all(...params);

    const byDay = db.prepare(`
      SELECT
        substr(r.created_at, 1, 10) as date,
        SUM(r.cost_usd) as cost_usd,
        SUM(r.tokens_input + r.tokens_output) as total_tokens
      FROM runs r
      LEFT JOIN projects p ON r.project_id = p.id
      ${where}
      GROUP BY date
      ORDER BY date ASC
    `).all(...params);

    res.json({ since, totals, byAgent, byDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
