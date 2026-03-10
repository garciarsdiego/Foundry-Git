import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { dispatchFlowRun } from '../services/flowService.js';

const router = Router();

// --- Workflow Templates (defined before /:id to avoid route conflicts) ---

const FLOW_TEMPLATES = [
  {
    id: 'tpl-flow-code-review',
    name: 'Automated Code Review',
    description: 'Pull request review pipeline: security audit → code quality → test coverage check.',
    category: 'engineering',
    steps: [
      { name: 'Security Audit', step_type: 'agent', description: 'Scan for OWASP vulnerabilities and secrets exposure' },
      { name: 'Code Quality Review', step_type: 'agent', description: 'Check correctness, performance and best practices' },
      { name: 'Test Coverage Analysis', step_type: 'agent', description: 'Identify untested code paths and suggest tests' },
      { name: 'Summary Report', step_type: 'agent', description: 'Synthesize findings into an actionable PR comment' },
    ],
  },
  {
    id: 'tpl-flow-feature-dev',
    name: 'Feature Development',
    description: 'End-to-end feature pipeline: spec → implementation → tests → documentation.',
    category: 'engineering',
    steps: [
      { name: 'Write Specification', step_type: 'agent', description: 'Create user stories and acceptance criteria' },
      { name: 'Implement Feature', step_type: 'agent', description: 'Write the implementation code' },
      { name: 'Write Tests', step_type: 'agent', description: 'Generate unit and integration tests' },
      { name: 'Update Documentation', step_type: 'agent', description: 'Update README and API docs' },
    ],
  },
  {
    id: 'tpl-flow-research',
    name: 'Deep Research',
    description: 'Multi-stage research pipeline: scope → collect → analyze → report.',
    category: 'research',
    steps: [
      { name: 'Define Research Scope', step_type: 'agent', description: 'Clarify research question and success criteria' },
      { name: 'Information Gathering', step_type: 'parallel', description: 'Collect data from multiple sources in parallel' },
      { name: 'Analysis & Synthesis', step_type: 'agent', description: 'Cross-reference findings and identify patterns' },
      { name: 'Report Writing', step_type: 'agent', description: 'Produce structured report with executive summary' },
    ],
  },
  {
    id: 'tpl-flow-incident-response',
    name: 'Incident Response',
    description: 'Structured incident response: detect → diagnose → remediate → post-mortem.',
    category: 'operations',
    steps: [
      { name: 'Assess Impact', step_type: 'agent', description: 'Determine scope and severity of the incident' },
      { name: 'Root Cause Analysis', step_type: 'agent', description: 'Identify the root cause and contributing factors' },
      { name: 'Implement Fix', step_type: 'agent', description: 'Apply the remediation' },
      { name: 'Post-Mortem Report', step_type: 'agent', description: 'Document timeline, cause, fix, and action items' },
    ],
  },
  {
    id: 'tpl-flow-content-pipeline',
    name: 'Content Creation Pipeline',
    description: 'Blog / docs pipeline: research → outline → draft → review → publish.',
    category: 'content',
    steps: [
      { name: 'Research Topic', step_type: 'agent', description: 'Research the topic and collect key insights' },
      { name: 'Create Outline', step_type: 'agent', description: 'Structure the content with headings and key points' },
      { name: 'Write Draft', step_type: 'agent', description: 'Write the full draft content' },
      { name: 'Review & Edit', step_type: 'agent', description: 'Check for clarity, accuracy and style' },
    ],
  },
  {
    id: 'tpl-flow-data-pipeline',
    name: 'Data Analysis Pipeline',
    description: 'Data workflow: ingest → clean → analyze → visualize → report.',
    category: 'data',
    steps: [
      { name: 'Data Ingestion', step_type: 'agent', description: 'Load and validate raw data sources' },
      { name: 'Data Cleaning', step_type: 'agent', description: 'Handle missing values, outliers and formatting' },
      { name: 'Analysis', step_type: 'parallel', description: 'Run statistical analysis and pattern detection' },
      { name: 'Insight Report', step_type: 'agent', description: 'Summarise findings with actionable recommendations' },
    ],
  },
];

// List workflow templates
router.get('/templates', (req, res) => {
  const { category } = req.query;
  let templates = FLOW_TEMPLATES;
  if (category) templates = templates.filter(t => t.category === category);
  res.json(templates);
});

// Instantiate a workflow from a template
router.post('/from-template', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, project_id, template_id, name } = req.body;
    if (!workspace_id || !template_id) {
      return res.status(400).json({ error: 'workspace_id and template_id are required' });
    }
    const template = FLOW_TEMPLATES.find(t => t.id === template_id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const flowId = uuidv4();
    const flowName = name || template.name;
    db.prepare(`
      INSERT INTO flows (id, workspace_id, project_id, name, description, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
    `).run(flowId, workspace_id, project_id || null, flowName, template.description);

    // Create steps
    template.steps.forEach((step, i) => {
      db.prepare(`
        INSERT INTO flow_steps (id, flow_id, name, step_type, position, config_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), flowId, step.name, step.step_type, i, JSON.stringify({ description: step.description }));
    });

    const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(flowId);
    const steps = db.prepare('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY position').all(flowId);
    res.status(201).json({ ...flow, steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
