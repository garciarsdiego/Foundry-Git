import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { dispatchFlowRun } from '../services/flowService.js';

const router = Router();

// List flows
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, project_id } = req.query;
    const conditions = [];
    const params = [];
    if (workspace_id) { conditions.push('workspace_id = ?'); params.push(workspace_id); }
    if (project_id) { conditions.push('project_id = ?'); params.push(project_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const flows = db.prepare(`SELECT * FROM flows ${where} ORDER BY created_at DESC`).all(...params);
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get flow with steps
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    const steps = db.prepare(`
      SELECT fs.*, a.name as agent_name, a.execution_mode
      FROM flow_steps fs
      LEFT JOIN agents a ON fs.agent_id = a.id
      WHERE fs.flow_id = ?
      ORDER BY fs.position ASC
    `).all(req.params.id);
    res.json({ ...flow, steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create flow
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, project_id, name, description, status } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO flows (id, workspace_id, project_id, name, description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, project_id || null, name, description || null, status || 'draft');
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(id);
    res.status(201).json(flow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update flow
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Flow not found' });
    const { name, description, status, project_id, canvas_layout_json } = req.body;
    db.prepare(`
      UPDATE flows SET name = ?, description = ?, status = ?, project_id = ?, canvas_layout_json = ?, updated_at = datetime('now') WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      status ?? existing.status,
      project_id !== undefined ? project_id : existing.project_id,
      canvas_layout_json !== undefined ? (canvas_layout_json ? JSON.stringify(canvas_layout_json) : null) : existing.canvas_layout_json,
      req.params.id
    );
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete flow
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM flows WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Flow Steps ---

// Add step to flow
router.post('/:id/steps', (req, res) => {
  try {
    const db = getDb();
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    const { agent_id, name, step_type, position, config_json } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Auto-position at end if not specified
    const maxPos = db.prepare('SELECT MAX(position) as m FROM flow_steps WHERE flow_id = ?').get(req.params.id);
    const pos = position !== undefined ? position : (maxPos?.m ?? -1) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO flow_steps (id, flow_id, agent_id, name, step_type, position, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, agent_id || null, name, step_type || 'agent', pos, config_json ? JSON.stringify(config_json) : null);

    const step = db.prepare(`
      SELECT fs.*, a.name as agent_name FROM flow_steps fs
      LEFT JOIN agents a ON fs.agent_id = a.id
      WHERE fs.id = ?
    `).get(id);
    res.status(201).json(step);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder steps (must be before /:stepId to prevent "reorder" being captured as a stepId)
router.put('/:id/steps/reorder', (req, res) => {
  try {
    const db = getDb();
    const { step_ids } = req.body; // ordered array of step IDs
    if (!Array.isArray(step_ids)) return res.status(400).json({ error: 'step_ids must be an array' });
    const update = db.prepare(`UPDATE flow_steps SET position = ?, updated_at = datetime('now') WHERE id = ? AND flow_id = ?`);
    const reorder = db.transaction((ids) => {
      ids.forEach((sid, idx) => update.run(idx, sid, req.params.id));
    });
    reorder(step_ids);
    res.json({ reordered: step_ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update step
router.put('/:id/steps/:stepId', (req, res) => {
  try {
    const db = getDb();
    const step = db.prepare('SELECT * FROM flow_steps WHERE id = ? AND flow_id = ?').get(req.params.stepId, req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    const { agent_id, name, step_type, position, config_json } = req.body;
    db.prepare(`
      UPDATE flow_steps SET agent_id = ?, name = ?, step_type = ?, position = ?, config_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      agent_id !== undefined ? agent_id : step.agent_id,
      name ?? step.name,
      step_type ?? step.step_type,
      position !== undefined ? position : step.position,
      config_json !== undefined ? JSON.stringify(config_json) : step.config_json,
      req.params.stepId
    );
    const updated = db.prepare(`
      SELECT fs.*, a.name as agent_name FROM flow_steps fs
      LEFT JOIN agents a ON fs.agent_id = a.id
      WHERE fs.id = ?
    `).get(req.params.stepId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete step
router.delete('/:id/steps/:stepId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM flow_steps WHERE id = ? AND flow_id = ?').run(req.params.stepId, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Flow Runs ---

// Run a flow against a card
router.post('/:id/run', async (req, res) => {
  try {
    const db = getDb();
    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    const steps = db.prepare('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY position ASC').all(req.params.id);
    if (steps.length === 0) return res.status(400).json({ error: 'Flow has no steps' });

    const { card_id, project_id } = req.body;
    const runId = uuidv4();
    db.prepare(`
      INSERT INTO flow_runs (id, flow_id, project_id, card_id, status, current_step_id)
      VALUES (?, ?, ?, ?, 'queued', ?)
    `).run(runId, req.params.id, project_id || flow.project_id || null, card_id || null, steps[0].id);

    const flowRun = db.prepare('SELECT * FROM flow_runs WHERE id = ?').get(runId);

    // Dispatch asynchronously
    dispatchFlowRun(runId).catch(err => console.error('Flow run dispatch error:', err));

    res.status(201).json(flowRun);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List flow runs for a flow
router.get('/:id/runs', (req, res) => {
  try {
    const db = getDb();
    const runs = db.prepare('SELECT * FROM flow_runs WHERE flow_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
