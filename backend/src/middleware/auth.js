import jwt from 'jsonwebtoken';

const ADMIN_PASSWORD = process.env.FOUNDRY_ADMIN_PASSWORD;
const DEFAULT_JWT_SECRET = 'foundry-dev-secret-change-in-prod';
export const JWT_SECRET = process.env.FOUNDRY_JWT_SECRET || DEFAULT_JWT_SECRET;
export const AUTH_ENABLED = !!ADMIN_PASSWORD;

if (AUTH_ENABLED && JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn('[foundry] WARNING: Auth is enabled but FOUNDRY_JWT_SECRET is not set. Using insecure default secret. Set FOUNDRY_JWT_SECRET in production.');
}

export function authMiddleware(req, res, next) {
  if (!AUTH_ENABLED) return next();

  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, role } for user tokens or { role } for legacy admin tokens
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Helper to check if the authenticated user has admin role */
export function requireAdmin(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
