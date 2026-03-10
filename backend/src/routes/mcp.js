import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM mcp_servers';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id);
    if (!server) return res.status(404).json({ error: 'MCP server not found' });
    res.json(server);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description, command, args_json, env_json, transport, is_enabled } = req.body;
    if (!workspace_id || !name || !command) {
      return res.status(400).json({ error: 'workspace_id, name, and command are required' });
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO mcp_servers (id, workspace_id, name, description, command, args_json, env_json, transport, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, workspace_id, name, description || null, command,
      args_json ? JSON.stringify(args_json) : null,
      env_json ? JSON.stringify(env_json) : null,
      transport || 'stdio',
      is_enabled !== false ? 1 : 0
    );
    res.status(201).json(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id);
    if (!server) return res.status(404).json({ error: 'MCP server not found' });
    const { name, description, command, args_json, env_json, transport, is_enabled } = req.body;
    db.prepare(`
      UPDATE mcp_servers SET name = ?, description = ?, command = ?, args_json = ?, env_json = ?, transport = ?, is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? server.name,
      description ?? server.description,
      command ?? server.command,
      args_json !== undefined ? JSON.stringify(args_json) : server.args_json,
      env_json !== undefined ? JSON.stringify(env_json) : server.env_json,
      transport ?? server.transport,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : server.is_enabled,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
