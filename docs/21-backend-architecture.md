# Backend Architecture

This document describes the internal structure of the Foundry-Git backend: an Express.js application written with ESM modules.

---

## Express App Structure

The entry point is `backend/src/index.js`. It creates the Express application, registers global middleware, and mounts every feature router under the `/api/*` namespace.

```
backend/src/
├── index.js              # App entry, middleware, route mounting
├── db/
│   └── index.js          # DB singleton, migrations, seed
├── middleware/
│   └── auth.js           # authMiddleware, requireAdmin
├── routes/
│   ├── auth.js
│   ├── workspaces.js
│   ├── projects.js
│   ├── boards.js
│   ├── cards.js
│   ├── agents.js
│   ├── teams.js
│   ├── providers.js
│   ├── runtimes.js
│   ├── skills.js
│   ├── mcp.js
│   ├── runs.js
│   ├── chat.js
│   ├── flows.js
│   ├── github.js
│   ├── webhooks.js
│   ├── companies.js
│   ├── settings.js
│   └── execution.js
└── services/
    ├── executionService.js
    ├── flowService.js
    └── githubService.js
```

---

## Route Registration Pattern

Every router is imported and mounted with `authMiddleware` applied globally:

```javascript
import workspacesRouter from './routes/workspaces.js';
app.use('/api/workspaces', authMiddleware, workspacesRouter);
```

Routes that require elevated privileges also use `requireAdmin` on individual endpoints:

```javascript
router.delete('/:id', requireAdmin, async (req, res) => { ... });
```

---

## Route File Structure

Each route file follows a consistent pattern:

```javascript
import { Router } from 'express';
import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM things').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO things (id, name) VALUES (?, ?)').run(id, req.body.name);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

All handlers use `try/catch` and return `{ error: err.message }` on failure.

---

## Middleware Chain

Requests flow through middleware in this order:

```mermaid
flowchart LR
    Request --> CORS
    CORS --> BodyParser["express.json()"]
    BodyParser --> authMiddleware
    authMiddleware --> RouteHandler["Route Handler"]
    RouteHandler --> Response
```

1. **CORS** — allows cross-origin requests from the frontend dev server.
2. **express.json()** — parses JSON request bodies.
3. **authMiddleware** — validates the `Authorization: Bearer <token>` header when `AUTH_ENABLED` is true. Skips validation when auth is disabled.
4. **Route Handler** — feature-specific logic with DB access.

---

## DB Singleton

`backend/src/db/index.js` exports a `getDb()` function that initializes the database on first call and returns the same instance on subsequent calls.

Key configuration applied at initialization:

```javascript
db.pragma('journal_mode = WAL');   // Write-Ahead Logging for concurrency
db.pragma('foreign_keys = ON');    // Enforce FK constraints
```

The module also runs `runMigrations()` automatically on startup, applying any pending schema changes without requiring a separate migration command.

---

## Service Layer

Business logic that spans multiple route handlers lives in `backend/src/services/`.

### executionService.js

Orchestrates agent task execution:

| Function | Responsibility |
|---|---|
| `createRun(cardId, agentId)` | Inserts a new run record with `queued` status |
| `dispatchRun(runId)` | Selects dispatch strategy (provider vs runtime) |
| `providerDispatch(run, agent)` | Calls external AI provider API (OpenAI, Anthropic, etc.) |
| `runtimeDispatch(run, agent)` | Spawns a subprocess runtime (Python, Node, etc.) |

### flowService.js

Drives multi-step flow execution:

| Function | Responsibility |
|---|---|
| `dispatchFlowRun(flowRunId)` | Iterates flow steps, calls `dispatchRun` per step |

### githubService.js

Wraps `@octokit/rest` operations:

- Creating issues and pull requests
- Pushing files to a repository
- Fetching repository metadata

---

## Zod Validation

Input validation with Zod is used in routes that receive complex or typed payloads. Example from `providers.js`:

```javascript
import { z } from 'zod';

const ProviderSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['openai', 'anthropic', 'ollama', 'custom']),
  api_key: z.string().optional(),
  base_url: z.string().url().optional(),
});

const ProviderUpdateSchema = ProviderSchema.partial();
```

Validation errors are caught and returned as `400` responses.

---

## UUID Generation

All primary keys are generated with `uuidv4()` from the `uuid` package:

```javascript
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

This ensures globally unique IDs without relying on auto-increment integers.

---

## ESM Modules

The backend uses ES Modules throughout (`"type": "module"` in `package.json`):

- All imports use the `import`/`export` syntax.
- File extensions (`.js`) are required in import paths.
- `__dirname` is not available; use `import.meta.url` with `fileURLToPath` when needed.

---

## Environment Variables

Environment variables are read directly from `process.env`. No `dotenv` package is required — Node.js 20+ loads `.env` files natively, or variables can be set in the shell.

Key variables:

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP server port | `3001` |
| `DATABASE_PATH` | Path to SQLite file | `./foundry.db` |
| `FOUNDRY_ADMIN_PASSWORD` | Enables auth when set | *(unset = auth disabled)* |
| `FOUNDRY_JWT_SECRET` | JWT signing secret | *(required if auth enabled)* |
| `GITHUB_TOKEN` | GitHub API PAT for githubService | *(optional)* |

---

## Route File Example: providers.js

`providers.js` is a good reference for the full pattern:

1. **Schema definition** — `ProviderSchema` and `ProviderUpdateSchema` with Zod.
2. **maskProvider helper** — strips `api_key` from responses, replacing it with a boolean `has_key`.
3. **GET /** — list all providers, masked.
4. **POST /** — validate body with `ProviderSchema`, insert, return created record.
5. **GET /:id** — fetch single provider, masked.
6. **PUT /:id** — validate with `ProviderUpdateSchema`, update fields.
7. **DELETE /:id** — delete by ID.

---

## See Also

- [API Reference](03-api-reference.md)
- [Database Operations](17-database-operations.md)
