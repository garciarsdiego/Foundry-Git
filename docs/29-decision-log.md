# Architecture Decision Log

This document captures Architecture Decision Records (ADRs) for significant technical choices made in the Foundry-Git platform. Each ADR is immutable once accepted; superseded decisions reference the newer ADR.

---

## ADR-001: SQLite with better-sqlite3

**Status**: Accepted

### Context
Foundry-Git needs a persistent data store. Early development priorities favoured simplicity, zero-dependency deployment, and low operational overhead. The anticipated user base for self-hosted instances is small-to-medium (single teams to small organisations), meaning single-node throughput is sufficient.

Options considered:
- **PostgreSQL** — mature, powerful, but requires a separate daemon, connection pooling, and substantially more ops complexity.
- **MySQL/MariaDB** — similar to PostgreSQL trade-offs.
- **SQLite (via `sqlite3`)** — embedded, zero-ops, but the `sqlite3` npm binding uses asynchronous callbacks that complicate transaction management.
- **SQLite (via `better-sqlite3`)** — synchronous, embedded, zero-ops, excellent transaction support, WAL mode support, and a clean API for prepared statements.

### Decision
Use **SQLite** as the sole database engine, accessed via the **`better-sqlite3`** npm package.

Enable **WAL mode** (`PRAGMA journal_mode=WAL`) and **foreign key enforcement** (`PRAGMA foreign_keys=ON`) at connection open time.

### Consequences
**Positive**:
- Single-file database; trivially backed up with `cp` or `sqlite3 .dump`.
- No separate database process to manage in deployment.
- Synchronous API simplifies transaction logic throughout the codebase.
- WAL mode enables concurrent reads without blocking writes, covering the typical mixed workload.
- Full ACID compliance with foreign key enforcement.

**Negative**:
- Not suitable for multi-node horizontal scaling (one writer at a time per file).
- Migration to PostgreSQL would require non-trivial effort if scaling needs arise.
- `better-sqlite3` is a native addon — cross-compilation for certain targets (e.g., Alpine musl, ARM) requires additional toolchain setup.

**Mitigation**: The [RFC: Multi-tenant SaaS](40-rfc-multi-tenant-saas.md) outlines a path to PostgreSQL if multi-node deployment becomes a requirement.

*Related*: [Database Operations](17-database-operations.md), [Glossary: WAL Mode](28-glossary.md#wal-mode)

---

## ADR-002: Monorepo with npm Workspaces

**Status**: Accepted

### Context
The platform consists of two distinct applications — a Node.js/Express backend and a React/Vite frontend — that are developed, versioned, and deployed together. Options for code organisation:
- **Separate repositories** — independent versioning, but increases coordination overhead (PRs across repos, mismatched versions, duplicated CI config).
- **Monorepo without workspace tooling** — single repo but manual path management for `node_modules` and scripts.
- **npm workspaces monorepo** — single repo with native npm support for hoisting dependencies and running scripts across packages.
- **Turborepo / Nx** — advanced monorepo tooling with caching, but adds complexity for a two-package project.

### Decision
Use a **single Git repository** (monorepo) with **npm workspaces** configured in the root `package.json`. The two workspace packages are `backend/` and `frontend/`.

### Consequences
**Positive**:
- A single `npm install` at the root installs all dependencies for both packages.
- Root-level scripts (`npm run dev`, `npm run build`) orchestrate both packages simultaneously.
- Shared type definitions or utilities can be extracted to a future `packages/shared` workspace without changing the repo structure.
- One CI pipeline, one PR, one changelog.

**Negative**:
- Slightly larger `node_modules` at root due to hoisting.
- Developers must be aware of which `package.json` to add dependencies to.

*Related*: [Repository Map](30-repo-map.md), [Local Dev Setup](20-local-dev-setup.md)

---

## ADR-003: JWT-Based Auth with FOUNDRY_ADMIN_PASSWORD Toggle

**Status**: Accepted

### Context
Foundry-Git is primarily a self-hosted developer tool. Many deployments operate on private networks where enforcing authentication for every local access adds friction. At the same time, internet-exposed deployments require proper authentication.

### Decision
Authentication is **opt-in**, controlled by the presence of the `FOUNDRY_ADMIN_PASSWORD` environment variable:

```
AUTH_ENABLED = !!process.env.FOUNDRY_ADMIN_PASSWORD
```

When `AUTH_ENABLED` is `false`, all API routes are accessible without credentials. When `true`, routes require a valid **JWT Bearer token** issued by `POST /api/auth/login`.

Tokens are signed with `JWT_SECRET`. A default secret is set for development convenience but must be overridden in production.

User roles (`admin`, `member`, `viewer`) are encoded in the JWT payload and enforced by the `auth` middleware.

### Consequences
**Positive**:
- Zero configuration required for local development.
- Single environment variable enables full auth for production deployments.
- Stateless JWT means no server-side session store is needed.

**Negative**:
- Developers may accidentally run production instances without setting `FOUNDRY_ADMIN_PASSWORD`.
- Token revocation is not possible without a token blocklist (not currently implemented).
- Short token expiry with refresh token flow is not yet implemented.

**Mitigation**: The [Security Hardening](19-security-hardening.md) guide emphasises setting `FOUNDRY_ADMIN_PASSWORD` and `JWT_SECRET` for any non-local deployment.

*Related*: [Authentication & RBAC](04-auth-and-rbac.md), [Glossary: JWT](28-glossary.md#jwt)

---

## ADR-004: Provider Abstraction Layer (Nine Providers)

**Status**: Accepted

### Context
The LLM ecosystem has multiple competing API providers, each with different base URLs, authentication mechanisms, and model naming conventions. Hardcoding a single provider would make the platform inflexible. Users need to swap providers, compare costs, and use specialised models for different tasks.

### Decision
Implement a **Provider Config** abstraction (table: `provider_configs`) that stores provider-specific connection details. The `provider_type` column is constrained to the set of supported providers:

`openai` | `anthropic` | `google` | `openrouter` | `minimax` | `glm` | `nvidia` | `groq` | `kimi`

Each provider config stores a `model`, an `api_key` (or `api_key_env_var` reference), and an optional `base_url` override. A workspace can have multiple configs of the same provider type for different models or rate-limit tiers.

API responses **never** return the raw `api_key`; instead, `api_key_set: boolean` is returned to confirm presence without exposing secrets.

### Consequences
**Positive**:
- Adding a new provider requires only adding a value to the CHECK constraint and corresponding execution logic.
- Multiple configs per provider enables A/B testing of models or cost tiers.
- `base_url` override supports OpenAI-compatible local inference (Ollama, LM Studio, vLLM).
- Secret masking prevents API key leakage via the API.

**Negative**:
- Each new provider may require custom request/response mapping if it deviates from the OpenAI API schema.
- The CHECK constraint requires a database migration to add providers.

*Related*: [Provider & Runtime Matrix](05-provider-runtime-matrix.md), [Glossary: Provider Config](28-glossary.md#provider-config)

---

## ADR-005: Dual Execution Mode (Provider API vs Runtime CLI Subprocess)

**Status**: Accepted

### Context
There is an emerging class of AI coding tools (Codex CLI, Claude Code, Gemini CLI, etc.) that operate as local CLI programs rather than REST APIs. These tools manage their own context windows, tool calls, and multi-step reasoning, making them qualitatively different from a single LLM API call.

### Decision
Support two orthogonal **execution modes** on every **Agent**:

1. **`provider`** — the backend calls the LLM provider HTTP API directly (using the agent's `provider_config_id`).
2. **`runtime`** — the backend spawns the CLI tool as a child process (using the agent's `runtime_config_id`), captures stdout/stderr, and streams events back.

Agents declare their `execution_mode` and may also carry a `fallback_provider_config_id` for automatic failover.

The `executionService.js` service abstracts the dispatch and drives the **Run** state machine regardless of mode.

### Consequences
**Positive**:
- A single agent model covers both API-based and subprocess-based execution without separate concepts.
- CLI runtimes that perform multi-step tool use are first-class citizens.
- Fallback mechanism increases reliability.

**Negative**:
- Subprocess lifecycle management (PIDs, timeouts, signal handling) adds complexity.
- CLI runtimes must be installed on the host; container images must include the relevant binaries.
- Output parsing differs per runtime, requiring runtime-specific parsers.

*Related*: [Provider & Runtime Matrix](05-provider-runtime-matrix.md), [Event & Run Lifecycle](06-event-and-run-lifecycle.md), [Glossary: Execution Mode](28-glossary.md#execution-mode)

---

## ADR-006: Position-Based Sequential Flow Steps (Not Graph-Based)

**Status**: Accepted

### Context
Workflow systems can model execution order in two ways: (a) a directed acyclic graph (DAG) where edges declare dependencies, or (b) a linear sequence where steps are ordered by a position integer. DAGs are more expressive but substantially harder to implement, visualise, and debug for typical users.

### Decision
**Flow Steps** use a `position INTEGER DEFAULT 0` column to determine execution order. Steps execute sequentially in ascending position order. Three step types exist: `'agent'` (run an agent), `'condition'` (branch logic), and `'parallel'` (run multiple sub-steps concurrently).

This model intentionally defers full DAG support.

### Consequences
**Positive**:
- Simple drag-to-reorder UI with integer position updates.
- Easy to reason about execution order; no cycle detection needed.
- `condition` and `parallel` step types provide sufficient expressiveness for most automation use cases.

**Negative**:
- Cannot model complex dependency graphs (fan-in from multiple predecessors, diamond patterns).
- `parallel` step type requires a convention for how sub-steps are encoded in `config_json`.

**Future**: The [RFC: Graph Workflows](34-rfc-graph-workflows.md) outlines a migration to a DAG model.

*Related*: [Flow Builder](11-flow-builder.md), [Glossary: Flow Step](28-glossary.md#flow-step)

---

## ADR-007: GitHub Integration via Octokit with Connection-per-Workspace Model

**Status**: Accepted

### Context
GitHub integration is a core feature: syncing issues to cards, creating branches and pull requests from runs, and receiving webhook events. Multiple authentication strategies exist (PAT, OAuth App, GitHub App). Different workspaces may connect to different GitHub organisations or accounts.

### Decision
Use the official **`@octokit/rest`** client for all GitHub API calls. Store credentials in **GitHub Connection** records (table: `github_connections`), scoped per workspace. Each connection supports either:
- A **Personal Access Token** stored as an environment variable reference (`access_token_env_var`).
- A **GitHub App** installation, using `app_id` + `installation_id`.

One connection per workspace may be marked `is_default`. The `githubService.js` service wraps Octokit and selects the appropriate connection at call time.

### Consequences
**Positive**:
- Different workspaces can connect to different GitHub orgs independently.
- GitHub App support enables installation-level access without per-user PATs.
- Octokit abstracts GitHub API versioning and retry logic.

**Negative**:
- GitHub App private key management requires additional secret storage.
- Token refresh for GitHub Apps (JWT → installation token) adds complexity.
- Credentials stored as env var references require the deployment environment to define those variables.

*Related*: [GitHub Integration](13-github-integration.md), [Glossary: GitHub Connection](28-glossary.md#github-connection)

---

## ADR-008: Workspace-Scoped Multi-Tenancy

**Status**: Accepted

### Context
Foundry-Git needs a tenancy model. Options: no tenancy (single-user), user-level tenancy (each user has private resources), workspace-level tenancy (a workspace is an org-like container shared by a team).

### Decision
The **Workspace** is the primary tenancy boundary. All core entities (projects, agents, teams, flows, provider configs, runtime configs, skills, MCP servers, users, webhooks) carry a `workspace_id` foreign key. Access control is enforced at the workspace level; users authenticated within a workspace can act on that workspace's resources per their role.

Workspaces are identified by a unique `slug` that forms stable URL paths.

### Consequences
**Positive**:
- Clean isolation between different teams or organisations sharing an installation.
- Simple FK-based queries for all workspace-scoped resources.
- Slug-based routing enables future subdomain-per-workspace routing.

**Negative**:
- Cross-workspace resource sharing (e.g., a shared skill library) requires explicit copying or a separate global scope concept.
- A user belongs to one workspace currently; multi-workspace user membership is not natively modelled.

**Future**: The [RFC: Multi-tenant SaaS](40-rfc-multi-tenant-saas.md) discusses evolving toward a full SaaS multi-tenant model.

*Related*: [Workspace & Project Guide](07-workspace-and-project-guide.md), [Glossary: Workspace](28-glossary.md#workspace)

---

## ADR-009: Agent Memory as Key-Value Store with Importance Levels

**Status**: Accepted

### Context
For agents to be useful across sessions, they need a way to persist facts. Full vector-database semantic memory is powerful but complex. A simple append-only log is easy but hard to query. A structured key-value store offers a middle ground: queryable by key, filterable by importance, human-readable.

### Decision
Implement **Agent Memory** as a structured key-value table (`agent_memories`) with these fields:
- `memory_key` — a string key the agent or system uses to look up specific memories.
- `content` — free-text value.
- `session_id` — optional UUID to scope memory to a conversation.
- `importance` — integer 1–5 (enforced by `CHECK(importance BETWEEN 1 AND 5)`), where 5 = most critical.

Agents reference their memories via the `agent_id` FK. The `workspace_id` denormalisation allows workspace-level queries.

### Consequences
**Positive**:
- Simple to implement and query with standard SQL.
- Importance field enables agents to prioritise which memories to include in context windows.
- Session scoping prevents cross-session contamination.
- Human-readable: admins can inspect and edit memories directly in the DB.

**Negative**:
- No semantic similarity search (full-text or vector); retrieval is key-based.
- No automatic eviction or importance decay.
- Scale-limited for agents that accumulate thousands of memories.

**Future**: The [RFC: Advanced Memory](35-rfc-advanced-memory.md) proposes semantic indexing and importance decay.

*Related*: [Agent Configuration](09-agent-configuration.md), [Glossary: Agent Memory](28-glossary.md#agent-memory)

---

## ADR-010: MCP Server Management for Tool Augmentation

**Status**: Accepted

### Context
The **Model Context Protocol (MCP)** is an emerging open standard for exposing tools and resources to LLM agents. Rather than hardcoding tool integrations, MCP allows external processes to serve tools over a defined transport (stdio, SSE, HTTP), making the tool layer extensible without modifying the core platform.

### Decision
Implement **MCP Server** records (table: `mcp_servers`) that store the command, arguments, environment variables, and transport type for each MCP-compatible tool server. The `is_enabled` flag allows individual servers to be toggled without deletion. MCP servers are workspace-scoped.

The `transport` column supports `'stdio'` (subprocess communication), `'sse'` (HTTP Server-Sent Events), and `'http'` (standard HTTP).

Agents reference MCP capabilities through the **Skill** system (`skill_type = 'mcp'`).

### Consequences
**Positive**:
- Any MCP-compatible tool server can be plugged in without code changes.
- `env_json` allows per-server environment variable injection for credentials.
- Transport flexibility covers local subprocesses and remote services.
- Aligns with the growing MCP ecosystem.

**Negative**:
- MCP is an evolving standard; breaking protocol changes may require updates.
- Subprocess MCP servers share the backend process's environment; careful `env_json` design is needed to avoid leaking credentials.
- Health-checking and lifecycle management for MCP server processes is not yet fully implemented.

*Related*: [MCP & Skills](14-mcp-and-skills.md), [Glossary: MCP Server](28-glossary.md#mcp-server)
