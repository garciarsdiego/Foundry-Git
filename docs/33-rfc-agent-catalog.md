# RFC: Agent Catalog

**Status**: Proposed  
**See also**: [Roadmap Overview](31-roadmap-overview.md) · [Agent Configuration](09-agent-configuration.md) · [Data Model](02-data-model.md)

## Problem

`GET /api/agents/templates` returns a hardcoded JSON array of 12 agent templates. There is no separation between a *template definition* and an *installed agent instance*, making it impossible to version templates, share them across workspaces, or build a marketplace.

## Proposal

Introduce an `agent_templates` table that persists versioned template definitions. Agents gain a `template_id` back-reference so instances can be traced to their source template.

## Schema Changes

```sql
CREATE TABLE IF NOT EXISTS agent_templates (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  template_key  TEXT NOT NULL UNIQUE,  -- e.g. 'code-reviewer'
  execution_mode TEXT NOT NULL DEFAULT 'provider'
                  CHECK(execution_mode IN ('provider','runtime')),
  system_prompt TEXT,
  category      TEXT,                  -- e.g. 'engineering', 'management'
  tags          TEXT,                  -- JSON array of strings
  version       TEXT NOT NULL DEFAULT '1.0.0',
  is_builtin    INTEGER NOT NULL DEFAULT 0,  -- 1 = shipped with Foundry
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Link installed agents back to their source template
ALTER TABLE agents ADD COLUMN template_id      TEXT REFERENCES agent_templates(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN template_version TEXT;
```

## Seed Data

Populate `agent_templates` at startup (`seedDefaultData`) with the 12 existing hardcoded templates:

| template_key | name | category |
|---|---|---|
| code-reviewer | Code Reviewer | engineering |
| test-writer | Test Writer | engineering |
| architect | Architect | engineering |
| devops | DevOps Engineer | operations |
| pm | Product Manager | management |
| tech-writer | Technical Writer | documentation |
| security-auditor | Security Auditor | security |
| data-analyst | Data Analyst | data |
| researcher | Researcher | research |
| ux-ui | UX/UI Designer | design |
| orchestrator | Orchestrator | management |
| browser-agent | Browser Agent | automation |

## API Changes

| Endpoint | Change |
|---|---|
| `GET /api/agents/templates` | Query `agent_templates` table instead of returning hardcoded array |
| `POST /api/agents/from-template` | Create agent from `agent_templates` row, set `template_id` |
| `GET /api/agents/templates/:key` | Fetch a single template by `template_key` |
| `POST /api/agents/templates` | (admin) Create custom template |
| `PUT /api/agents/templates/:id` | (admin) Update template |

## Template Marketplace Concept

Future: expose a public HTTP endpoint that Foundry instances can query for community-contributed templates. Templates would be distributed as JSON files with a manifest.

## Migration Plan

1. Add `CREATE TABLE IF NOT EXISTS agent_templates` to `schema.sql`
2. Add `addColumnIfMissing` calls for `agents.template_id` and `agents.template_version` in `runMigrations()`
3. Populate `agent_templates` inside `seedDefaultData()` using `INSERT OR IGNORE`
4. Update `GET /api/agents/templates` route to query DB
5. Add `POST /api/agents/from-template` route

## Implementation Steps

1. Schema + seed
2. Route changes
3. Frontend: update Agents page "Create from Template" flow to use new API
