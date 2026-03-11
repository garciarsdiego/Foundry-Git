# Contributing

> **See also**: [Local Dev Setup](20-local-dev-setup.md) · [Backend Architecture](21-backend-architecture.md) · [Frontend Architecture](22-frontend-architecture.md)

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/<you>/Foundry-Git.git`
3. Install dependencies: `npm install`
4. Create a feature branch (see naming conventions below)
5. Make your changes
6. Submit a Pull Request

## Branch Naming

| Prefix | When to use |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code restructuring without behaviour change |
| `chore/` | Dependency updates, CI, tooling |

Example: `feature/add-slack-provider`, `fix/run-status-not-updating`

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(agents): add monthly budget enforcement
fix(runs): correct status transition on timeout
docs(api): document /api/execute endpoint
refactor(db): extract migration helpers
```

## Pull Request Process

1. Ensure the backend starts without errors: `npm run dev`
2. Describe what changed and why in the PR body
3. Reference any related issues: `Closes #42`
4. Request a review from a maintainer

## Code Style

**Backend:**
- ESM modules (`import`/`export`), `.js` extensions
- `async`/`await` everywhere — no raw Promise chains
- Every route handler wrapped in `try { ... } catch (err) { res.status(500).json({error: err.message}) }`
- UUIDs via `uuidv4()` for all primary keys
- Zod schemas for input validation on write endpoints

**Frontend:**
- Functional React components with hooks
- Tailwind utility classes — no inline styles
- `api.js` wrapper for all HTTP calls
- One component per file

## Adding a New API Route

1. Create `backend/src/routes/myresource.js`:
   ```js
   import { Router } from 'express';
   import { getDb } from '../db/index.js';
   const router = Router();
   router.get('/', (req, res) => { ... });
   export default router;
   ```
2. Mount it in `backend/src/index.js`:
   ```js
   import myResourceRouter from './routes/myresource.js';
   app.use('/api/myresource', authMiddleware, myResourceRouter);
   ```
3. Document the new endpoints in [API Reference](03-api-reference.md)

## Adding a New Frontend Page

1. Create `frontend/src/pages/MyPage.jsx`
2. Add the route in `frontend/src/App.jsx`:
   ```jsx
   <Route path="/mypage" element={<MyPage />} />
   ```
3. Add a sidebar nav entry in `frontend/src/components/Shell.jsx`

## Adding a New LLM Provider

1. Add the new type string to `PROVIDER_TYPES` in `backend/src/routes/providers.js`
2. Add it to the `CHECK` constraint in `backend/src/db/schema.sql`
3. Add a migration in `runMigrations()` in `backend/src/db/index.js` (table recreation pattern)
4. Handle the new provider in `providerDispatch()` in `backend/src/services/executionService.js`
5. Update [Provider & Runtime Matrix](05-provider-runtime-matrix.md)

## Adding a New Runtime

1. Add the type to `runtime_configs` CHECK constraint (schema + migration)
2. Add `getDefaultBinary()` case and `buildRuntimeArgs()` case in `executionService.js`
3. Update [Provider & Runtime Matrix](05-provider-runtime-matrix.md)

## Database Schema Changes

- **New column**: use `addColumnIfMissing(table, column, definition)` in `runMigrations()`
- **CHECK constraint change**: use the table-rename-recreate-drop pattern
- **New table**: add `CREATE TABLE IF NOT EXISTS` to `schema.sql` — it is idempotent

Never modify existing data in migrations; only add structure.
