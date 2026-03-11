# Security Hardening

Cross-references: [Authentication & RBAC](04-auth-and-rbac.md) · [Configuration Reference](16-configuration-reference.md)

---

## JWT Configuration

Authentication is enabled by setting `FOUNDRY_ADMIN_PASSWORD`. Tokens are signed with `FOUNDRY_JWT_SECRET` using `jsonwebtoken`.

**Production requirements:**
- Set `FOUNDRY_JWT_SECRET` to a cryptographically random string of at least 64 bytes.
- The default value (`foundry-dev-secret-change-in-prod`) logs a warning at startup and **must never be used in production**.

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Password Hashing

Admin passwords are hashed with **scrypt** before storage:

```
hash = scryptSync(password, salt, 64)   // N=16384, r=8, p=1
stored = hex(salt) + ':' + hex(hash)    // 16-byte random salt
```

Comparison uses `timingSafeEqual()` to prevent timing-based attacks.

---

## API Key Masking

Provider API keys are **never returned** in API responses. The `maskProvider()` helper strips `api_key` from the response object and replaces it with `api_key_set: true|false`.

Similarly, `webhook_configs.secret` is masked in all list and get endpoints.

---

## Webhook HMAC Verification

Inbound webhook payloads are authenticated via HMAC-SHA256:

1. Compute `HMAC-SHA256(secret, raw_body)`.
2. Compare against the `X-Hub-Signature-256` header from the sender.
3. Comparison uses `timingSafeEqual()`.
4. Requests with a missing or invalid signature are rejected with `401`.

The `secret` is stored in `webhook_configs.secret` and is set when creating the webhook.

---

## SQL Injection Prevention

All database interactions use **parameterized prepared statements** via better-sqlite3:

```js
// Safe — parameter bound separately
db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
```

String interpolation into SQL is not used anywhere in the codebase.

---

## Auth Middleware

Two middleware functions protect routes when `AUTH_ENABLED` is true:

| Middleware | Behaviour |
|---|---|
| `authMiddleware()` | Validates `Authorization: Bearer <token>` on every protected route; returns `401` if missing or invalid |
| `requireAdmin()` | Further restricts to tokens with `role = admin`; returns `403` for non-admin roles |

When `FOUNDRY_ADMIN_PASSWORD` is not set, `AUTH_ENABLED` is false and all routes are publicly accessible — suitable only for local development.

---

## CORS Considerations

In production, restrict CORS to your frontend origin. Add to `backend/src/index.js`:

```js
app.use(cors({ origin: 'https://foundry.example.com' }));
```

The default development configuration allows all origins.

---

## Rate Limiting

The backend does not currently include rate limiting. For public-facing deployments, add `express-rate-limit`:

```js
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
```

---

## Input Validation

Provider configuration inputs are validated with **Zod** schemas before being written to the database. Extend this pattern to any new routes that accept untrusted input.

---

## Secrets in .env

- Add `.env` to `.gitignore`.
- Never log or expose env var values.
- In production, inject secrets via your platform's secret manager rather than a file on disk.

---

## Dependency Security

```bash
npm audit            # check for known vulnerabilities
npm audit fix        # auto-fix compatible updates
```

Run `npm audit` as part of CI and before every production deployment.

---

## File System Security

- `DATABASE_PATH` should point to a directory outside the web root.
- Ensure the SQLite file is not readable by the web server process if using a reverse proxy.
- Restrict file permissions: `chmod 600 foundry.db`.
