import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, AUTH_ENABLED } from '../middleware/auth.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ auth_enabled: AUTH_ENABLED });
});

router.post('/login', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({ token: null, message: 'Auth disabled — dev mode' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const adminPassword = process.env.FOUNDRY_ADMIN_PASSWORD;
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
