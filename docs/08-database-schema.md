# Foundry — Database Schema (Current vs Target) + Migration Plan

This document specifies:
- **Current state** (derived from repo audit)
- **Target state** (schema required by the product)
- **Migration plan** from current → target

**Hard rules (target must hold):**
- Every operational record must be traceable to a **Company** (direct `company_id` or via a chain).
- `created_at`, `updated_at` on all tables.
- Prefer soft delete (`deleted_at`) over hard delete.
- Trust/provenance fields are first-class for imported assets and artifacts.
- Worktrees are first-class.
- Approvals are first-class objects.
- Memory candidates exist from MVP1.

---

## 1) Current state (repo audit output)

Status: **investigated (partial)** — Audit performed on 2026-03-11.

### 1.1 Current DB technology
- **SQLite** via `better-sqlite3`.
  - Dependency: `backend/package.json` includes `better-sqlite3`.

### 1.2 Current schema bootstrap + migrations approach
- Schema file: `backend/src/db/schema.sql` is executed on startup via `initializeSchema()`.
- Migrations: `backend/src/db/index.js` runs ad-hoc incremental migrations via `runMigrations()`.
  - Adds columns with `ALTER TABLE ... ADD COLUMN` in a try/catch idempotent pattern.
  - For expanding SQLite CHECK constraints, it renames and recreates tables (e.g., provider/runtime config tables).

### 1.3 Current backend wiring (relevant to DB usage)
- App boot: `backend/src/index.js` initializes DB with `getDb()` and mounts routes.

### 1.4 Current confirmed tables (from `schema.sql` snippets + route usage)
> Note: this list may be incomplete until the full file is reviewed end-to-end.

Core:
- `workspaces`
- `projects` (workspace-scoped)
- `companies`
- `company_projects` (company ↔ project association)

Kanban:
- `boards`, `board_columns`, `cards`

Agents, skills, teams:
- `agents`
- `skills`, `agent_skills`
- `teams`, `team_memberships`, `project_teams`
- `agent_memories` (agent-scoped key/value memory)

Providers/runtimes:
- `provider_configs` (provider_type CHECK includes: openai/anthropic/google/openrouter/minimax/glm/nvidia/groq/kimi)
- `runtime_configs` (runtime_type CHECK includes: codex/claude-code/gemini-cli/kimi-code/kilo-code/opencode)

Execution:
- `execution_policies`
- `runs` (includes: runtime_type, provider_type, branch_name, worktree_path, pr_number, pr_url, token/cost fields)
- `run_events`

Chat:
- `chat_messages` (session inferred via `session_id` string; workspace-scoped)

Interop-ish + integrations:
- `mcp_servers`
- `github_connections`
- `webhook_configs`

Workflows (v1 step-list):
- `flows`, `flow_steps`, `flow_runs`

Users:
- `users`

### 1.5 Current chat session persistence model
- There is **no first-class `chat_sessions` table** in the inspected portions.
- Sessions are inferred from `chat_messages.session_id`.
- Recent sessions are listed by grouping messages by `session_id` filtered by `workspace_id`.

### 1.6 Current execution model notes (schema implications)
- `runs` are **project-scoped** (`project_id NOT NULL`), not company-scoped.
- Company is present but is not the pivot key for most operational tables.

### 1.7 Key gaps vs target schema (high impact)
- No confirmed `approval_requests` table/model.
- No confirmed artifacts/files tables (FileAsset/ArtifactRecord/etc.).
- No catalog vs installation split (agents are workspace-scoped; MCP servers exist but not as catalog/install).
- Company-first scoping is not enforced across runs/chat/flows.

---

## 2) Target schema overview

The target schema supports MVP1→MVP3 and must be company-first.

### 2.1 Core domain tables
- `workspaces`
- `users`
- `companies`
- `projects`
- `teams`
- `boards`
- `tasks`
- `task_board_placements`
- `worktrees`

### 2.2 Catalog and installs
- `catalog_items`
- `catalog_item_versions`
- `import_descriptors`
- `verification_reports`
- `installed_resources`
- `installed_resource_overrides`
- `update_notifications`

### 2.3 Chat and sessions
- `chat_sessions`
- `chat_messages`
- `session_attachments`

### 2.4 Workflow graph
- `workflows`
- `workflow_versions`
- `workflow_nodes`
- `workflow_edges`
- `workflow_runs`
- `workflow_run_events`

### 2.5 Execution fabric / runs / approvals
- `providers`
- `provider_bindings`
- `runtimes`
- `runtime_instances`
- `cli_registry_entries`
- `runs`
- `run_events`
- `approval_requests`
- `compare_run_sets`
- `compare_run_members`

### 2.6 Files / docs / research artifacts
- `file_assets`
- `document_assets`
- `page_artifacts`
- `crawl_artifacts`
- `research_artifacts`
- `source_bundles`
- `artifact_links`

### 2.7 Memory
- `memory_entries`
- `memory_candidates`
- `memory_promotions`
- `memory_retention_policies`

### 2.8 Interop
- `mcp_entries`
- `acp_assets`
- `acp_wrappers`
- `acp_space_bindings`
- `acp_project_bindings`
- `a2a_bridges`

### 2.9 Channels / notifications
- `channels`
- `channel_sessions`
- `notifications`
- `channel_constraints`
- `handoff_links`

---

## 3) Migration plan (current → target)

Status: **draft** (blocked by completing full schema + frontend audit).

### 3.1 Step 0: finish audit
- Review full `backend/src/db/schema.sql` end-to-end
- Confirm whether artifacts, approvals, and any file tables exist
- Inspect `frontend/src` for existing surfaces and constraints

### 3.2 Step 1: introduce company-first keys
- Add `company_id` to `projects` and migrate `company_projects` semantics
- Add `company_id` to `runs`, `flows`, `chat_messages` (or new `chat_sessions`)
- Ensure indexes on `company_id`

### 3.3 Step 2: split Catalog vs Installation
- Introduce `catalog_items` and `installed_resources`
- Migrate `agents` (workspace-scoped) into:
  - Catalog Agent Templates
  - Installed Company Agents

### 3.4 Step 3: add approvals model
- Introduce `approval_requests` and integrate into run/tool actions

### 3.5 Step 4: add artifacts/files model
- Introduce `file_assets` + artifact tables and ensure provenance linking

---

## Links
- Open questions: `29-open-questions.md`
- Domains: `07-domains.md`
- MVP plan: `05-mvp-plan.md`