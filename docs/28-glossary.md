# Glossary

Alphabetical reference of domain terms used throughout the Foundry-Git platform and its documentation.

---

## A

### Agent
An AI entity configured within a workspace that can execute tasks. Each agent references a **Provider Config** or **Runtime Config** (or both, for fallback), carries a `system_prompt` defining its behaviour, and may have a `monthly_budget_usd` cap. Agents are the primary actors in **Runs**, **Flow Steps**, and **Chat Sessions**.

*See also*: [Agent Configuration](09-agent-configuration.md), [Provider Config](#provider-config), [Runtime Config](#runtime-config), [Execution Mode](#execution-mode)

### Agent Memory
A key-value store attached to an agent (table: `agent_memories`). Each memory record holds a `memory_key`, free-text `content`, an optional `session_id` for scoping, and an `importance` integer between 1 (trivial) and 5 (critical). Memories allow agents to retain facts across separate runs and chat sessions.

*See also*: [RFC: Advanced Memory](35-rfc-advanced-memory.md), [Agent Configuration](09-agent-configuration.md)

### Agent Skill
A join-table record (`agent_skills`) that associates an **Agent** with a **Skill**. The association is unique per `(agent_id, skill_id)` pair. When an agent executes, its attached skills augment its capability set.

*See also*: [MCP & Skills](14-mcp-and-skills.md), [Skill](#skill)

### Architecture Decision Record (ADR)
A short document that captures the context, decision, and consequences of a significant architectural choice. The full log is at [Architecture Decision Log](29-decision-log.md).

---

## B

### Bearer Token
An HTTP Authorization header value of the form `Bearer <jwt>`. The Foundry-Git backend expects this header on all protected routes when `AUTH_ENABLED` is `true`.

*See also*: [JWT](#jwt), [Authentication & RBAC](04-auth-and-rbac.md)

### Board
A **Kanban** board scoped to a **Project** (table: `boards`). A board contains one or more **Board Columns** into which **Cards** are placed. Multiple boards can exist per project.

*See also*: [Board & Card Workflow](08-board-and-card-workflow.md), [Board Column](#board-column), [Card](#card)

### Board Column
An ordered lane within a **Board** (table: `board_columns`). Columns have a `position` integer for ordering and a human-readable `name` (e.g., "To Do", "In Progress", "Done").

*See also*: [Board & Card Workflow](08-board-and-card-workflow.md)

---

## C

### Card
The atomic unit of work on a **Board** (table: `cards`). A card has a `title`, optional `description`, a `status` (default `'todo'`), a `priority` (default `'medium'`), and can be linked to a GitHub issue via `github_issue_number` / `github_issue_url`. Cards may be assigned to an **Agent** and may reference a completed **Run**.

*See also*: [Board & Card Workflow](08-board-and-card-workflow.md), [Run](#run)

### Chat Session
A logical grouping of **Chat Messages** sharing the same `session_id` UUID (table: `chat_messages`). Sessions allow multi-turn conversations with an **Agent** to be retrieved as a coherent history.

*See also*: [Chat Interface](12-chat-interface.md), [RFC: Chat Sessions](36-rfc-chat-sessions.md)

### Chat Message
A single turn in a **Chat Session** (table: `chat_messages`). Roles are `'user'`, `'assistant'`, or `'system'`. Token and cost fields are populated after assistant turns.

*See also*: [Chat Interface](12-chat-interface.md)

### Company
An optional organizational entity that groups **Projects** (tables: `companies`, `company_projects`). Companies hold metadata such as `industry`, `company_size`, and contact information. The relationship is many-to-many between companies and projects.

*See also*: [RFC: Company Scoping](32-rfc-company-scoping.md)

### Company Project
A join-table record (`company_projects`) that associates a **Company** with a **Project**. The combination `(company_id, project_id)` is unique.

---

## D

### Dispatch
The act of submitting a **Run** or **Flow Run** to the execution layer. The `/api/execute` endpoint and the card `POST /:id/execute` endpoint are the primary dispatch surfaces.

*See also*: [Event & Run Lifecycle](06-event-and-run-lifecycle.md)

---

## E

### Execution Mode
The strategy used when an **Agent** processes a task. Two modes exist:
- **`provider`** — the backend makes a direct HTTP API call to an LLM provider (OpenAI, Anthropic, etc.) using a **Provider Config**.
- **`runtime`** — the backend spawns a CLI subprocess (Codex, Claude Code, etc.) using a **Runtime Config**.

Agents carry an `execution_mode` column (`CHECK('provider','runtime')`). A `fallback_provider_config_id` enables automatic fallback when the primary path fails.

*See also*: [Provider & Runtime Matrix](05-provider-runtime-matrix.md), [ADR-005](29-decision-log.md#adr-005)

### Execution Policy
A reusable set of retry and timeout rules (table: `execution_policies`). Fields include `max_retries` (default 3), `timeout_seconds` (default 300), and `fallback_enabled` (default 0). Policies can be applied to **Runs** and **Flow Steps**.

*See also*: [Event & Run Lifecycle](06-event-and-run-lifecycle.md)

---

## F

### Flow
A named, sequential pipeline of **Flow Steps** (table: `flows`). Flows exist in one of three statuses: `'draft'`, `'active'`, or `'archived'`. A flow is scoped to a **Workspace** and optionally to a **Project**.

*See also*: [Flow Builder](11-flow-builder.md), [Flow Step](#flow-step), [Flow Run](#flow-run)

### Flow Run
An execution instance of a **Flow** (table: `flow_runs`). Mirrors the **Run** lifecycle with statuses `'queued'`, `'running'`, `'success'`, `'failed'`, `'cancelled'`. Tracks `current_step_id` for progress visibility.

*See also*: [Flow Builder](11-flow-builder.md), [Event & Run Lifecycle](06-event-and-run-lifecycle.md)

### Flow Step
An individual node within a **Flow** (table: `flow_steps`). Steps have a `position` integer for ordering, a `step_type` (`'agent'`, `'condition'`, or `'parallel'`), and a `config_json` blob for step-specific settings. Optionally bound to an **Agent**.

*See also*: [Flow Builder](11-flow-builder.md), [ADR-006](29-decision-log.md#adr-006)

---

## G

### GitHub Connection
A stored credential record that enables the backend to call the GitHub API on behalf of a workspace (table: `github_connections`). Supports both PAT-based (`access_token_env_var`) and GitHub App-based (`app_id`, `installation_id`) authentication. Multiple connections may exist per workspace; one may be flagged `is_default`.

*See also*: [GitHub Integration](13-github-integration.md), [ADR-007](29-decision-log.md#adr-007)

---

## J

### JWT (JSON Web Token)
A signed, compact token issued on successful login at `POST /api/auth/login`. The backend signs tokens with the `JWT_SECRET` environment variable. All protected API routes validate the `Authorization: Bearer <token>` header when `AUTH_ENABLED` is `true`.

*See also*: [Authentication & RBAC](04-auth-and-rbac.md), [Bearer Token](#bearer-token), [ADR-003](29-decision-log.md#adr-003)

---

## K

### Kanban
A visual workflow method using columns and cards to represent work stages. Foundry-Git's **Board** / **Board Column** / **Card** model is a Kanban implementation.

*See also*: [Board & Card Workflow](08-board-and-card-workflow.md)

---

## M

### MCP Server
A **Model Context Protocol** server definition (table: `mcp_servers`). MCP servers expose tools and resources to agents at runtime. Each record stores the `command`, `args_json`, `env_json`, `transport` type (`'stdio'`, `'sse'`, or `'http'`), and an `is_enabled` flag. Scoped to a workspace.

*See also*: [MCP & Skills](14-mcp-and-skills.md), [ADR-010](29-decision-log.md#adr-010)

### Migration
A versioned, ordered SQL script that evolves the database schema. Foundry-Git uses a sequential migration system stored under `backend/src/db/`. Migrations are applied at startup.

*See also*: [Database Operations](17-database-operations.md)

---

## P

### Project
A container for **Boards**, **Cards**, **Flows**, and **Runs** within a **Workspace** (table: `projects`). Projects carry optional GitHub repository metadata (`repo_owner`, `repo_name`, `default_branch`) to enable GitHub integration. Identified within a workspace by a unique `slug`.

*See also*: [Workspace & Project Guide](07-workspace-and-project-guide.md)

### Provider Config
A stored configuration record for an LLM provider API (table: `provider_configs`). Holds the `provider_type` (one of nine: `openai`, `anthropic`, `google`, `openrouter`, `minimax`, `glm`, `nvidia`, `groq`, `kimi`), the target `model`, an `api_key` (or `api_key_env_var` reference), and an optional `base_url` override. The API key is **never** returned raw by the API; responses substitute `api_key_set: boolean`.

*See also*: [Provider & Runtime Matrix](05-provider-runtime-matrix.md), [ADR-004](29-decision-log.md#adr-004)

---

## R

### RBAC (Role-Based Access Control)
The permission system layered on top of JWT authentication. Three roles are defined: `admin` (full access), `member` (read/write most resources), and `viewer` (read-only). Roles are stored on the **User** record and enforced by the `auth` middleware.

*See also*: [Authentication & RBAC](04-auth-and-rbac.md)

### Run
A single execution attempt triggered against a **Card** or directly (table: `runs`). A run progresses through the states: `queued → running → success | failed | cancelled`. Tracks runtime metadata (`branch_name`, `worktree_path`, `pr_number`, `pr_url`) and cost telemetry (`tokens_input`, `tokens_output`, `cost_usd`).

*See also*: [Event & Run Lifecycle](06-event-and-run-lifecycle.md)

### Run Event
An immutable log entry appended to a **Run** (table: `run_events`). Each event carries an `event_type`, a human-readable `message`, and a `metadata_json` payload. Events are streamed to the frontend via Server-Sent Events (SSE).

*See also*: [Event & Run Lifecycle](06-event-and-run-lifecycle.md), [Monitoring & Logging](18-monitoring-and-logging.md)

### Runtime Config
A stored configuration for a CLI-based execution runtime (table: `runtime_configs`). Holds `runtime_type` (one of: `codex`, `claude-code`, `gemini-cli`, `kimi-code`, `kilo-code`, `opencode`), `binary_path`, and `extra_args`. One record per workspace may be flagged `is_default`.

*See also*: [Provider & Runtime Matrix](05-provider-runtime-matrix.md), [Execution Mode](#execution-mode)

---

## S

### Seed Data
A set of initial records inserted into the database on first startup to make the platform functional without manual setup (e.g., a default workspace, a default admin user).

*See also*: [Database Operations](17-database-operations.md), [Local Dev Setup](20-local-dev-setup.md)

### Session ID
A UUID that groups related records under a logical session. Used in **Chat Messages** (`session_id`) and **Agent Memories** (`session_id`) to scope context to a single conversation or execution session.

*See also*: [Chat Session](#chat-session), [Agent Memory](#agent-memory)

### Skill
A reusable capability definition that can be attached to one or more **Agents** via **Agent Skills** (table: `skills`). Skill types are `'system_prompt'` (injects additional prompt text), `'mcp'` (references an MCP tool), or `'tool'` (a custom tool definition). Skills may be marked `is_public` to share across agents in a workspace.

*See also*: [MCP & Skills](14-mcp-and-skills.md)

### Slug
A URL-safe, lowercase identifier derived from a name (e.g., `"My Project"` → `"my-project"`). Used in **Workspaces** (`slug` UNIQUE) and **Projects** (`slug` UNIQUE within workspace). Slugs allow stable, human-readable URL segments.

*See also*: [Workspace & Project Guide](07-workspace-and-project-guide.md)

### Subdomain
A planned routing mechanism where each **Workspace** would be accessible at its own subdomain (e.g., `acme.foundry.example.com`). Currently workspaces are path-scoped; subdomain routing is a future consideration.

*See also*: [RFC: Multi-tenant SaaS](40-rfc-multi-tenant-saas.md)

---

## T

### Team
A named group of **Agents** within a workspace (table: `teams`). Teams support hierarchical nesting via `parent_team_id` (self-referential FK) and a designated `manager_agent_id`. Team membership is managed through **Team Memberships**.

*See also*: [Team Hierarchy](10-team-hierarchy.md)

### Team Membership
A join-table record (`team_memberships`) linking an **Agent** to a **Team** with an optional `role` and `title`. The `(team_id, agent_id)` pair is unique.

*See also*: [Team Hierarchy](10-team-hierarchy.md)

---

## U

### User
A human account that authenticates with the platform (table: `users`). Stores `username` (UNIQUE), `email`, `password_hash`, `role` (`admin`/`member`/`viewer`), and `is_active`. Optionally scoped to a **Workspace** via `workspace_id`.

*See also*: [Authentication & RBAC](04-auth-and-rbac.md)

---

## W

### WAL Mode
**Write-Ahead Logging** — a SQLite journaling mode enabled via `PRAGMA journal_mode=WAL`. WAL allows concurrent reads while a write transaction is in progress, significantly improving throughput for the mixed read/write workloads typical of Foundry-Git.

*See also*: [ADR-001](29-decision-log.md#adr-001), [Database Operations](17-database-operations.md)

### Webhook Config
A stored inbound webhook definition (table: `webhook_configs`). Each config has a `secret` for HMAC signature verification, an `events_json` array (default `["push"]`) declaring which GitHub event types it handles, and optional bindings to a **Flow** and **Project**. Receives payloads at `POST /api/webhooks/receive/:id`.

*See also*: [Webhook System](25-webhook-system.md)

### Worker
The internal execution engine that picks up queued **Runs** and **Flow Runs** and drives them to completion. Currently implemented as an in-process service (`executionService.js`) within the Express backend.

*See also*: [Backend Architecture](21-backend-architecture.md), [RFC: Python Worker](37-rfc-python-worker.md)

### Workspace
The top-level multi-tenancy boundary in Foundry-Git (table: `workspaces`). All other entities — projects, agents, teams, flows, provider configs, runtime configs, and users — are owned by a workspace. Identified by a unique `slug`.

*See also*: [Workspace & Project Guide](07-workspace-and-project-guide.md), [ADR-008](29-decision-log.md#adr-008)
