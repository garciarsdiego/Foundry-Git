import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET, AUTH_ENABLED, authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getDb, hashPassword, verifyPassword } from '../db/index.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ auth_enabled: AUTH_ENABLED });
});

router.post('/login', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({ token: null, message: 'Auth disabled — dev mode' });
  }

  const { username, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // If username is provided, try user-based authentication first
  if (username) {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    if (user && verifyPassword(password, user.password_hash)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Legacy: admin password-only login (backward compatibility)
  const adminPassword = process.env.FOUNDRY_ADMIN_PASSWORD;
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Try to find the admin user in the DB for a richer token
  const db = getDb();
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin' AND is_active = 1").get();
  if (adminUser) {
    const token = jwt.sign(
      { id: adminUser.id, username: adminUser.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    return res.json({ token, user: { id: adminUser.id, username: adminUser.username, role: 'admin' } });
  }

  // No admin user in DB yet — issue a legacy role-only token
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { username: 'admin', role: 'admin' } });
});

// --- User management (requires auth + admin role) ---
// These sub-routes apply authMiddleware and requireAdmin before handling
router.use('/users', authMiddleware, requireAdmin);

// List users
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(
      'SELECT id, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at ASC'
    ).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user
router.post('/users', (req, res) => {
  try {
    const db = getDb();
    const { username, email, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const validRoles = ['admin', 'member', 'viewer'];
    const userRole = validRoles.includes(role) ? role : 'member';

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get();
    const id = uuidv4();
    const passwordHash = hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, workspace_id, username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, ws?.id || null, username, email || null, passwordHash, userRole);

    const user = db.prepare(
      'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(id);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:id', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { email, password, role, is_active } = req.body;
    const validRoles = ['admin', 'member', 'viewer'];
    const newRole = role && validRoles.includes(role) ? role : user.role;
    const newPasswordHash = password ? hashPassword(password) : user.password_hash;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;

    db.prepare(`
      UPDATE users SET email = ?, password_hash = ?, role = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(email ?? user.email, newPasswordHash, newRole, newActive, req.params.id);

    const updated = db.prepare(
      'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ?'
    ).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete the admin user' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
