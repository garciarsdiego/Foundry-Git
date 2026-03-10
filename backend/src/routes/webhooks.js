import { Router } from 'express';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { dispatchFlowRun } from '../services/flowService.js';

const router = Router();

// --- Webhook config CRUD (protected by auth middleware in index.js) ---

// List webhook configs
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    const conditions = [];
    const params = [];
    if (workspace_id) { conditions.push('w.workspace_id = ?'); params.push(workspace_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const configs = db.prepare(`
      SELECT w.*, f.name as flow_name, p.name as project_name
      FROM webhook_configs w
      LEFT JOIN flows f ON w.flow_id = f.id
      LEFT JOIN projects p ON w.project_id = p.id
      ${where}
      ORDER BY w.created_at DESC
    `).all(...params);
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create webhook config
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, flow_id, secret, events, project_id, is_enabled } = req.body;
    if (!workspace_id || !name) {
      return res.status(400).json({ error: 'workspace_id and name are required' });
    }
    const id = uuidv4();
    const eventsJson = JSON.stringify(Array.isArray(events) ? events : ['push']);
    db.prepare(`
      INSERT INTO webhook_configs (id, workspace_id, name, flow_id, secret, events_json, project_id, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, workspace_id, name,
      flow_id || null,
      secret || null,
      eventsJson,
      project_id || null,
      is_enabled !== false ? 1 : 0
    );
    const config = db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(id);
    res.status(201).json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update webhook config
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Webhook config not found' });
    const { name, flow_id, secret, events, project_id, is_enabled } = req.body;
    const eventsJson = Array.isArray(events) ? JSON.stringify(events) : existing.events_json;
    db.prepare(`
      UPDATE webhook_configs
      SET name = ?, flow_id = ?, secret = ?, events_json = ?, project_id = ?, is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      flow_id !== undefined ? (flow_id || null) : existing.flow_id,
      secret !== undefined ? (secret || null) : existing.secret,
      eventsJson,
      project_id !== undefined ? (project_id || null) : existing.project_id,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : existing.is_enabled,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete webhook config
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM webhook_configs WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Public GitHub webhook receiver — mounted separately before the auth middleware.
 * Path: POST /api/webhooks/receive/:id
 */
export async function handleWebhookReceive(req, res) {
  try {
    const db = getDb();
    const config = db.prepare('SELECT * FROM webhook_configs WHERE id = ?').get(req.params.id);
    if (!config || !config.is_enabled) {
      return res.status(404).json({ error: 'Webhook not found or disabled' });
    }

    // Verify HMAC-SHA256 signature when a secret is configured
    if (config.secret) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
      }
      const rawBody = JSON.stringify(req.body);
      const expected = 'sha256=' + createHmac('sha256', config.secret).update(rawBody).digest('hex');
      // Constant-time compare
      if (signature.length !== expected.length || !safeEqual(signature, expected)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const githubEvent = req.headers['x-github-event'] || 'unknown';
    const allowedEvents = JSON.parse(config.events_json || '["push"]');
    if (!allowedEvents.includes(githubEvent) && !allowedEvents.includes('*')) {
      return res.status(200).json({ message: `Event "${githubEvent}" not in configured trigger list — ignored` });
    }

    // If a flow is configured, trigger a flow run
    if (config.flow_id) {
      const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(config.flow_id);
      if (!flow) {
        return res.status(200).json({ message: 'Flow not found — skipping dispatch' });
      }
      const steps = db.prepare('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY position ASC').all(config.flow_id);
      if (steps.length === 0) {
        return res.status(200).json({ message: 'Flow has no steps — skipping dispatch' });
      }

      const runId = uuidv4();
      db.prepare(`
        INSERT INTO flow_runs (id, flow_id, project_id, status, current_step_id)
        VALUES (?, ?, ?, 'queued', ?)
      `).run(runId, config.flow_id, config.project_id || flow.project_id || null, steps[0].id);

      // Fire-and-forget dispatch
      dispatchFlowRun(runId).catch(err =>
        console.error(`Webhook flow run ${runId} dispatch error:`, err.message)
      );

      return res.status(200).json({
        message: `Triggered flow run for "${flow.name}"`,
        flow_run_id: runId,
        event: githubEvent,
      });
    }

    res.status(200).json({ message: `Webhook received event "${githubEvent}" — no flow configured` });
  } catch (err) {
    console.error('Webhook receive error:', err);
    res.status(500).json({ error: err.message });
  }
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export default router;
