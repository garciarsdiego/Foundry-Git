import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const workspace = db.prepare('SELECT * FROM workspaces LIMIT 1').get();
    if (!workspace) return res.status(404).json({ error: 'No workspace found' });

    const providers = db.prepare('SELECT * FROM provider_configs WHERE workspace_id = ?').all(workspace.id);
    const runtimes = db.prepare('SELECT * FROM runtime_configs WHERE workspace_id = ?').all(workspace.id);
    const githubConnections = db.prepare('SELECT * FROM github_connections WHERE workspace_id = ?').all(workspace.id);

    res.json({
      workspace,
      providers,
      runtimes,
      github_connections: githubConnections,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
