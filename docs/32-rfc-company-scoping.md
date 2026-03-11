# RFC: Company Scoping

**Status**: Proposed  
**See also**: [Roadmap Overview](31-roadmap-overview.md) · [Data Model](02-data-model.md) · [Workspace & Project Guide](07-workspace-and-project-guide.md)

## Problem

The `companies` table currently acts as a simple CRM — it stores client metadata and links to projects via `company_projects`. Projects, agents, and chat sessions are not natively scoped to a company, making it impossible to answer "which agents work for Acme Corp?" or "show all chats related to Project X of Acme?"

## Proposal

Evolve `Company` into a first-class organisational scope by adding an optional `company_id` foreign key to `projects`, `agents`, and `chat_messages`.

## Schema Changes

```sql
-- Phase 1: add company_id to projects
ALTER TABLE projects ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;

-- Phase 2: add company_id to agents
ALTER TABLE agents ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;

-- Phase 3: add company_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE SET NULL;
```

All three FKs are nullable (`ON DELETE SET NULL`) so the change is fully backward-compatible.

## Migration Plan

Add the following calls inside `runMigrations()` in `backend/src/db/index.js`:

```js
addColumnIfMissing('projects',      'company_id', 'TEXT REFERENCES companies(id) ON DELETE SET NULL');
addColumnIfMissing('agents',        'company_id', 'TEXT REFERENCES companies(id) ON DELETE SET NULL');
addColumnIfMissing('chat_messages', 'company_id', 'TEXT REFERENCES companies(id) ON DELETE SET NULL');
```

## API Changes

| Endpoint | Change |
|---|---|
| `GET /api/projects?company_id=` | Add optional filter |
| `POST /api/projects` | Accept `company_id` in body |
| `GET /api/agents?company_id=` | Add optional filter |
| `POST /api/agents` | Accept `company_id` in body |
| `GET /api/chat/sessions?company_id=` | Add optional filter |

## UI Changes

- Project creation form: optional "Company" dropdown
- Agent creation form: optional "Company" dropdown
- Company detail page: show linked agents and direct projects alongside the existing project association list

## Business Rules

- `company_id` is always optional (nullable). Resources without a company remain accessible at the workspace level.
- A project may have both a direct `company_id` and a row in `company_projects` during the transition period.
- Long-term the `company_projects` join table can be deprecated in favour of the direct FK.

## Implementation Steps

1. Add migration calls in `db/index.js`
2. Update route handlers for projects, agents, chat to accept and filter by `company_id`
3. Update frontend forms
4. Update [Data Model](02-data-model.md) ER diagram
