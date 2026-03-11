# Testing Strategy

> **See also**: [Backend Architecture](21-backend-architecture.md) · [Contributing](24-contributing.md)

## Current State

The repository does not yet include a formal test suite. This document defines the recommended testing approach for contributors adding tests in the future.

## Recommended Stack

| Layer | Tool |
|---|---|
| Backend unit tests | [Vitest](https://vitest.dev/) or Jest |
| API integration tests | [Supertest](https://github.com/ladjs/supertest) + in-memory SQLite |
| Frontend component tests | Vitest + [React Testing Library](https://testing-library.com/) |
| E2E tests | [Playwright](https://playwright.dev/) |

## Backend Unit Tests

### `executionService.js`

- Mock `better-sqlite3` to return fixture runs/agents
- Test `createRun()`: verifies DB insert, status='queued', returns run object
- Test `dispatchRun()`: state transition queued→running→success/failed
- Test retry logic: stub provider call to fail N times, verify retry count and fallback
- Test `withTimeout()`: resolve before timeout, reject after timeout

```js
// Example skeleton (Vitest)
import { describe, it, expect, vi } from 'vitest';
import { createRun } from '../src/services/executionService.js';

vi.mock('../src/db/index.js', () => ({ getDb: () => mockDb }));

describe('createRun', () => {
  it('inserts a queued run and returns it', async () => {
    const run = await createRun('card-1', 'agent-1');
    expect(run.status).toBe('queued');
  });
});
```

### `flowService.js`

- Mock `createRun` and `dispatchRun`
- Test step iteration order (ascending position)
- Test parallel step fire-and-forget behaviour
- Test failure propagation from agent steps

### Auth Middleware

- `authMiddleware` passes through when `AUTH_ENABLED = false`
- Returns 401 when no `Authorization` header and `AUTH_ENABLED = true`
- Returns 401 on invalid/expired token
- Attaches `req.user` on valid token

## API Integration Tests

Use Supertest with an in-memory SQLite database (`:memory:`) to test the full HTTP stack without touching the file system.

```js
import request from 'supertest';
import app from '../src/index.js';

describe('GET /api/workspaces', () => {
  it('returns an empty array initially', async () => {
    const res = await request(app).get('/api/workspaces');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
```

**Test cases to cover:**

- CRUD for workspaces, projects, agents, providers
- POST /api/execute → run created with status 'queued'
- Auth: 401 without token, 200 with valid token when AUTH_ENABLED
- Zod validation: POST /api/providers with invalid provider_type returns 400
- Provider API masking: GET /api/providers never returns raw `api_key`

## Frontend Component Tests

```jsx
import { render, screen } from '@testing-library/react';
import StatusBadge from '../src/components/StatusBadge';

test('renders green badge for success', () => {
  render(<StatusBadge status="success" />);
  expect(screen.getByText('success')).toBeInTheDocument();
});
```

**Components to test:** `StatusBadge`, `Modal`, `ConfirmModal`, `Toast`

Mock `api.js` when testing page components to avoid real HTTP calls.

## End-to-End Tests

Playwright user journey:

1. Navigate to login page
2. Enter admin password → redirected to dashboard
3. Create workspace → create project → create agent
4. Create card → assign agent → click Execute
5. Observe run status change to 'running' then 'success'/'failed'
6. Check run events list on RunDetailPage

## Test Database Setup

```js
// test/setup.js
import { getDb } from '../src/db/index.js';

process.env.DATABASE_PATH = ':memory:';

export function resetDb() {
  const db = getDb();
  db.exec('DELETE FROM run_events; DELETE FROM runs; DELETE FROM cards; ...');
}
```

Reset the DB between test cases using `beforeEach(resetDb)`.

## CI Integration

Add a GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install
      - run: npm test --workspace=backend
      - run: npm test --workspace=frontend
```
