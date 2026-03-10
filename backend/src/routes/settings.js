import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

function maskWebhook(w) {
  const { secret, ...rest } = w;
  return { ...rest, secret_set: !!secret };
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const workspace = db.prepare('SELECT * FROM workspaces LIMIT 1').get();
    if (!workspace) return res.status(404).json({ error: 'No workspace found' });

    const providers = db.prepare('SELECT * FROM provider_configs WHERE workspace_id = ?').all(workspace.id);
    const runtimes = db.prepare('SELECT * FROM runtime_configs WHERE workspace_id = ?').all(workspace.id);
    const githubConnections = db.prepare('SELECT * FROM github_connections WHERE workspace_id = ?').all(workspace.id);
    const webhooks = db.prepare('SELECT * FROM webhook_configs WHERE workspace_id = ?').all(workspace.id);

    res.json({
      workspace,
      providers,
      runtimes,
      github_connections: githubConnections,
      webhooks: webhooks.map(maskWebhook),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/workspace', (req, res) => {
  try {
    const db = getDb();
    const workspace = db.prepare('SELECT * FROM workspaces LIMIT 1').get();
    if (!workspace) return res.status(404).json({ error: 'No workspace found' });

    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    db.prepare(`UPDATE workspaces SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(name.trim(), workspace.id);
    const updated = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspace.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
