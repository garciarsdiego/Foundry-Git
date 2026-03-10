# API Reference

Complete REST API reference for the Foundry-Git backend. All endpoints are prefixed with `/api`.

**Base URL**: `http://localhost:3001` (development) or your deployment hostname.

**Authentication**: When `AUTH_ENABLED=true` (i.e., `FOUNDRY_ADMIN_PASSWORD` is set), all endpoints except `GET /api/auth/status` and `POST /api/auth/login` require the header:
```
Authorization: Bearer <jwt_token>
```

**Content type**: All request and response bodies are `application/json`.

**Common error shape**:
```json
{ "error": "Human-readable error message" }
```

---

## 1. Auth — `/api/auth`

### GET /api/auth/status
**Description**: Returns current authentication configuration and session status. Always accessible (no auth required).

**Response 200**:
```json
{
  "auth_enabled": true,
  "authenticated": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "workspace_id": "uuid"
  }
}
```
When not authenticated: `"authenticated": false`, `"user": null`.

---

### POST /api/auth/login
**Description**: Authenticate with username and password. Returns a signed JWT token.

**Request body**:
```json
{
  "username": "admin",
  "password": "secret"
}
```

**Response 200**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "workspace_id": "uuid"
  }
}
```

**Response 401**: `{ "error": "Invalid credentials" }`
**Response 403**: `{ "error": "Account is disabled" }`

---

### GET /api/auth/users
**Description**: List all user accounts. Requires `admin` role.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "workspace_id": "uuid",
    "is_active": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST /api/auth/users
**Description**: Create a new user account. Requires `admin` role.

**Request body**:
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securepassword",
  "role": "member",
  "workspace_id": "uuid"
}
```

**Response 201**:
```json
{ "id": "uuid", "username": "alice", "role": "member" }
```

**Response 400**: `{ "error": "Username already exists" }`

---

### PUT /api/auth/users/:id
**Description**: Update a user account. Requires `admin` role. Password will be re-hashed if provided.

**Request body** (all fields optional):
```json
{
  "email": "alice@newdomain.com",
  "role": "viewer",
  "is_active": 0,
  "password": "newpassword"
}
```

**Response 200**: Updated user object (without `password_hash`).
**Response 404**: `{ "error": "User not found" }`

---

### DELETE /api/auth/users/:id
**Description**: Delete a user account. Requires `admin` role.

**Response 204**: No content.
**Response 404**: `{ "error": "User not found" }`

---

## 2. Workspaces — `/api/workspaces`

### GET /api/workspaces
**Description**: List all workspaces.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST /api/workspaces
**Description**: Create a new workspace.

**Request body**:
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

**Response 201**: Created workspace object.
**Response 400**: `{ "error": "Slug already exists" }`

---

### GET /api/workspaces/:id
**Description**: Get a single workspace by ID.

**Response 200**: Workspace object.
**Response 404**: `{ "error": "Workspace not found" }`

---

### PUT /api/workspaces/:id
**Description**: Update workspace name or slug.

**Request body** (all fields optional):
```json
{ "name": "Acme Corp Updated", "slug": "acme-corp-v2" }
```

**Response 200**: Updated workspace object.

---

### DELETE /api/workspaces/:id
**Description**: Delete a workspace and all its resources (CASCADE).

**Response 204**: No content.

---

## 3. Projects — `/api/projects`

All endpoints are scoped to the active workspace (determined from the JWT or query parameter).

### GET /api/projects
**Description**: List all projects in the workspace.

**Query parameters**:
- `workspace_id` (required when not inferred from JWT)

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Platform Redesign",
    "slug": "platform-redesign",
    "description": "Full platform UI overhaul",
    "repo_url": "https://github.com/acme/platform",
    "repo_owner": "acme",
    "repo_name": "platform",
    "default_branch": "main"
  }
]
```

---

### POST /api/projects
**Description**: Create a new project.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Platform Redesign",
  "slug": "platform-redesign",
  "description": "Full platform UI overhaul",
  "repo_owner": "acme",
  "repo_name": "platform",
  "default_branch": "main"
}
```

**Response 201**: Created project object.
**Response 400**: `{ "error": "Slug already exists in this workspace" }`

---

### GET /api/projects/:id
**Description**: Get a single project by ID.

**Response 200**: Project object.
**Response 404**: `{ "error": "Project not found" }`

---

### PUT /api/projects/:id
**Description**: Update project fields.

**Request body** (all optional): Any project fields.

**Response 200**: Updated project object.

---

### DELETE /api/projects/:id
**Description**: Delete a project and all its boards, cards, runs, and flow runs (CASCADE).

**Response 204**: No content.

---

## 4. Boards — `/api/boards`

### GET /api/boards
**Description**: List all boards. Supports filtering by project.

**Query parameters**:
- `project_id` — filter boards for a specific project

**Response 200**:
```json
[
  { "id": "uuid", "project_id": "uuid", "name": "Sprint 1" }
]
```

---

### POST /api/boards
**Description**: Create a new board.

**Request body**:
```json
{ "project_id": "uuid", "name": "Sprint 1" }
```

**Response 201**: Created board object.

---

### GET /api/boards/:id
**Description**: Get a single board with its columns.

**Response 200**:
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "Sprint 1",
  "columns": [
    { "id": "uuid", "name": "To Do", "position": 0 },
    { "id": "uuid", "name": "In Progress", "position": 1 },
    { "id": "uuid", "name": "Done", "position": 2 }
  ]
}
```

---

### PUT /api/boards/:id
**Description**: Update board name.

**Request body**: `{ "name": "Sprint 2" }`

**Response 200**: Updated board object.

---

### DELETE /api/boards/:id
**Description**: Delete board (columns and card references SET NULL).

**Response 204**: No content.

---

### GET /api/boards/:id/columns
**Description**: List columns for a board, ordered by `position`.

**Response 200**: Array of column objects.

---

### POST /api/boards/:id/columns
**Description**: Add a column to a board.

**Request body**:
```json
{ "name": "In Review", "position": 2 }
```

**Response 201**: Created column object.

---

### PUT /api/boards/columns/:id
**Description**: Update a column's name or position.

**Request body** (all optional):
```json
{ "name": "Review", "position": 3 }
```

**Response 200**: Updated column object.

---

### DELETE /api/boards/columns/:id
**Description**: Delete a column (cards in column have `column_id` SET NULL).

**Response 204**: No content.

---

## 5. Cards — `/api/cards`

### GET /api/cards
**Description**: List cards. Supports multiple filters.

**Query parameters**:
- `project_id` — filter by project
- `board_id` — filter by board
- `column_id` — filter by column
- `status` — filter by status string
- `assignee_agent_id` — filter by assigned agent

**Response 200**: Array of card objects with all fields.

---

### POST /api/cards
**Description**: Create a new card.

**Request body**:
```json
{
  "project_id": "uuid",
  "board_id": "uuid",
  "column_id": "uuid",
  "title": "Implement login page",
  "description": "Build the React login form with validation",
  "status": "todo",
  "priority": "high",
  "assignee_agent_id": "uuid"
}
```

**Response 201**: Created card object.

---

### GET /api/cards/:id
**Description**: Get a single card with full detail.

**Response 200**: Card object including `github_issue_number`, `github_issue_url`, `run_id`.
**Response 404**: `{ "error": "Card not found" }`

---

### PUT /api/cards/:id
**Description**: Update card fields. Used for drag-and-drop column changes, status updates, priority changes, and assignment.

**Request body** (all optional):
```json
{
  "title": "Updated title",
  "column_id": "uuid",
  "status": "in_progress",
  "priority": "critical",
  "assignee_agent_id": "uuid",
  "github_issue_number": 42,
  "github_issue_url": "https://github.com/acme/platform/issues/42"
}
```

**Response 200**: Updated card object.

---

### DELETE /api/cards/:id
**Description**: Delete a card.

**Response 204**: No content.

---

### POST /api/cards/:id/execute
**Description**: Trigger an agent execution run for this card. Creates a `Run` record and dispatches it asynchronously to `executionService`.

**Request body** (optional):
```json
{
  "agent_id": "uuid",
  "branch_name": "feature/login-page"
}
```

**Response 202**:
```json
{
  "run_id": "uuid",
  "status": "queued",
  "message": "Run queued successfully"
}
```

**Response 400**: `{ "error": "No agent assigned to card and no agent_id provided" }`

---

## 6. Agents — `/api/agents`

### GET /api/agents
**Description**: List all agents in the workspace.

**Query parameters**:
- `workspace_id` — filter by workspace

**Response 200**: Array of agent objects. `provider_config_id` and `runtime_config_id` are included; actual configs are not embedded.

---

### POST /api/agents
**Description**: Create a new agent.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Code Reviewer",
  "description": "Reviews pull requests for code quality",
  "execution_mode": "provider",
  "provider_config_id": "uuid",
  "system_prompt": "You are an expert code reviewer...",
  "monthly_budget_usd": 50.00
}
```

**Response 201**: Created agent object.

---

### GET /api/agents/templates
**Description**: Returns a list of built-in agent templates that can be used to pre-populate agent creation forms.

**Response 200**:
```json
[
  {
    "name": "Code Reviewer",
    "description": "Reviews PRs for quality and best practices",
    "execution_mode": "provider",
    "system_prompt": "You are an expert code reviewer..."
  }
]
```

---

### GET /api/agents/:id
**Description**: Get a single agent with full detail including attached skills and memories.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Code Reviewer",
  "execution_mode": "provider",
  "skills": [...],
  "memories": [...]
}
```

---

### PUT /api/agents/:id
**Description**: Update agent configuration.

**Request body** (all optional): Any agent fields.

**Response 200**: Updated agent object.

---

### DELETE /api/agents/:id
**Description**: Delete an agent. Associated cards and runs have `agent_id` SET NULL.

**Response 204**: No content.

---

## 7. Teams — `/api/teams`

### GET /api/teams
**Description**: List teams in the workspace.

**Response 200**: Array of team objects including `parent_team_id` and `manager_agent_id`.

---

### POST /api/teams
**Description**: Create a new team.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Backend Team",
  "description": "Handles API and database work",
  "parent_team_id": null,
  "manager_agent_id": "uuid"
}
```

**Response 201**: Created team object.

---

### GET /api/teams/:id
**Description**: Get a team with its members and sub-teams.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Backend Team",
  "members": [
    { "agent_id": "uuid", "role": "member", "title": "API Engineer" }
  ],
  "sub_teams": []
}
```

---

### PUT /api/teams/:id
**Description**: Update team fields.

**Response 200**: Updated team object.

---

### DELETE /api/teams/:id
**Description**: Delete a team. Memberships are CASCADE deleted.

**Response 204**: No content.

---

### GET /api/teams/:id/members
**Description**: List all members of a team.

**Response 200**: Array of `{ agent_id, agent_name, role, title }` objects.

---

### POST /api/teams/:id/members
**Description**: Add an agent to a team.

**Request body**:
```json
{
  "agent_id": "uuid",
  "role": "member",
  "title": "Senior Engineer"
}
```

**Response 201**: Created membership object.
**Response 409**: `{ "error": "Agent is already a member of this team" }`

---

### DELETE /api/teams/:id/members/:agentId
**Description**: Remove an agent from a team.

**Response 204**: No content.

---

## 8. Providers — `/api/providers`

> **Security note**: The `api_key` field is **never** returned in any response. All responses include `api_key_set: boolean` to indicate whether a key is stored.

### GET /api/providers
**Description**: List provider configs for the workspace.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "OpenAI GPT-4o",
    "provider_type": "openai",
    "model": "gpt-4o",
    "base_url": null,
    "api_key_env_var": "OPENAI_API_KEY",
    "api_key_set": true,
    "is_default": 1
  }
]
```

---

### POST /api/providers
**Description**: Create a new provider config.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "OpenAI GPT-4o",
  "provider_type": "openai",
  "model": "gpt-4o",
  "api_key": "sk-...",
  "is_default": 1
}
```

**Response 201**: Provider object with `api_key_set: true`, never the raw key.

---

### GET /api/providers/:id
**Description**: Get a single provider config.

**Response 200**: Provider object with `api_key_set` instead of `api_key`.

---

### PUT /api/providers/:id
**Description**: Update provider config. Supply `api_key` to replace the stored key.

**Response 200**: Updated provider object.

---

### DELETE /api/providers/:id
**Description**: Delete a provider config. Agents referencing it have `provider_config_id` SET NULL.

**Response 204**: No content.

---

## 9. Runtimes — `/api/runtimes`

### GET /api/runtimes
**Description**: List runtime configs for the workspace.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Claude Code",
    "runtime_type": "claude-code",
    "binary_path": "/usr/local/bin/claude",
    "extra_args": "--no-color",
    "is_default": 0
  }
]
```

---

### POST /api/runtimes
**Description**: Create a new runtime config.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Claude Code",
  "runtime_type": "claude-code",
  "binary_path": "/usr/local/bin/claude",
  "extra_args": "",
  "is_default": 1
}
```

**Response 201**: Created runtime config object.

---

### GET /api/runtimes/:id
**Description**: Get a single runtime config.

**Response 200**: Runtime config object.

---

### PUT /api/runtimes/:id
**Description**: Update a runtime config.

**Response 200**: Updated runtime config.

---

### DELETE /api/runtimes/:id
**Description**: Delete a runtime config. Agents referencing it have `runtime_config_id` SET NULL.

**Response 204**: No content.

---

## 10. Skills — `/api/skills`

### GET /api/skills
**Description**: List skills in the workspace (includes public skills).

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "TypeScript Expert",
    "description": "Deep TypeScript knowledge",
    "skill_type": "system_prompt",
    "content": "You are an expert TypeScript developer...",
    "is_public": 1
  }
]
```

---

### POST /api/skills
**Description**: Create a new skill.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "TypeScript Expert",
  "skill_type": "system_prompt",
  "content": "You are an expert TypeScript developer...",
  "is_public": 1
}
```

**Response 201**: Created skill object.

---

### GET /api/skills/catalog
**Description**: Returns the built-in skill catalog — predefined skills available for import.

**Response 200**: Array of skill template objects (not yet persisted to the workspace).

---

### GET /api/skills/:id
**Description**: Get a single skill.

**Response 200**: Skill object.

---

### PUT /api/skills/:id
**Description**: Update a skill.

**Response 200**: Updated skill.

---

### DELETE /api/skills/:id
**Description**: Delete a skill. Associated `agent_skills` records CASCADE deleted.

**Response 204**: No content.

---

## 11. MCP Servers — `/api/mcp`

### GET /api/mcp
**Description**: List MCP server configurations for the workspace.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Filesystem Tools",
    "description": "Read/write local filesystem",
    "command": "npx",
    "args_json": "[\"@modelcontextprotocol/server-filesystem\", \"/workspace\"]",
    "env_json": "{}",
    "transport": "stdio",
    "is_enabled": 1
  }
]
```

---

### POST /api/mcp
**Description**: Register a new MCP server.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Filesystem Tools",
  "command": "npx",
  "args_json": "[\"@modelcontextprotocol/server-filesystem\", \"/workspace\"]",
  "transport": "stdio",
  "is_enabled": 1
}
```

**Response 201**: Created MCP server object.

---

### GET /api/mcp/:id
**Description**: Get a single MCP server config.

**Response 200**: MCP server object.

---

### PUT /api/mcp/:id
**Description**: Update MCP server configuration (e.g., toggle `is_enabled`).

**Response 200**: Updated MCP server object.

---

### DELETE /api/mcp/:id
**Description**: Delete an MCP server config.

**Response 204**: No content.

---

## 12. Runs — `/api/runs`

### GET /api/runs
**Description**: List runs with optional filters.

**Query parameters**:
- `project_id` — filter by project
- `agent_id` — filter by agent
- `status` — filter by status (`queued`, `running`, `success`, `failed`, `cancelled`)
- `card_id` — filter by card
- `limit` — max results (default 50)
- `offset` — pagination offset

**Response 200**:
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "card_id": "uuid",
    "agent_id": "uuid",
    "status": "success",
    "started_at": "2024-01-01T10:00:00Z",
    "finished_at": "2024-01-01T10:02:30Z",
    "runtime_type": null,
    "provider_type": "openai",
    "branch_name": "feature/login",
    "pr_number": 42,
    "pr_url": "https://github.com/acme/platform/pull/42",
    "tokens_input": 1250,
    "tokens_output": 3800,
    "cost_usd": 0.0614
  }
]
```

---

### GET /api/runs/:id
**Description**: Get a single run with full detail.

**Response 200**: Run object.
**Response 404**: `{ "error": "Run not found" }`

---

### POST /api/runs/:id/cancel
**Description**: Request cancellation of a queued or running run. Sets status to `cancelled`.

**Response 200**: `{ "status": "cancelled" }`
**Response 400**: `{ "error": "Run is not in a cancellable state" }`

---

### GET /api/runs/:id/events
**Description**: **Server-Sent Events (SSE)** stream of `run_events` for a run. The connection stays open while the run is active and closes when the run reaches a terminal state.

**Headers sent by server**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event format**:
```
data: {"id":"uuid","event_type":"stdout","message":"Analysing codebase...","created_at":"2024-01-01T10:00:01Z"}
```

**Response 404**: `{ "error": "Run not found" }` (non-SSE, before upgrade)

---

## 13. Chat — `/api/chat`

### GET /api/chat/sessions
**Description**: List all chat sessions for the workspace, with last message preview.

**Query parameters**:
- `workspace_id` — required
- `agent_id` — filter to sessions with a specific agent

**Response 200**:
```json
[
  {
    "session_id": "uuid",
    "agent_id": "uuid",
    "agent_name": "Code Reviewer",
    "message_count": 12,
    "last_message_at": "2024-01-01T15:30:00Z",
    "last_message_preview": "The code looks good overall, but..."
  }
]
```

---

### POST /api/chat/message
**Description**: Send a message to an agent and receive a response. Appends both the user message and the assistant response to the session.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "agent_id": "uuid",
  "session_id": "uuid",
  "content": "Review this function for edge cases",
  "role": "user"
}
```

**Response 200**:
```json
{
  "message_id": "uuid",
  "session_id": "uuid",
  "role": "assistant",
  "content": "Looking at the function, I see three edge cases...",
  "tokens_input": 450,
  "tokens_output": 320,
  "cost_usd": 0.0077
}
```

**Response 400**: `{ "error": "Agent not found or not configured" }`

---

### GET /api/chat/history/:sessionId
**Description**: Retrieve all messages in a chat session, ordered by creation time.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "role": "user",
    "content": "Review this function for edge cases",
    "created_at": "2024-01-01T15:29:00Z"
  },
  {
    "id": "uuid",
    "role": "assistant",
    "content": "Looking at the function, I see three edge cases...",
    "tokens_input": 450,
    "tokens_output": 320,
    "cost_usd": 0.0077,
    "created_at": "2024-01-01T15:29:05Z"
  }
]
```

---

## 14. Flows — `/api/flows`

### GET /api/flows
**Description**: List flows in the workspace.

**Query parameters**:
- `workspace_id` — required
- `project_id` — filter to a project
- `status` — filter by `draft`, `active`, `archived`

**Response 200**: Array of flow objects.

---

### POST /api/flows
**Description**: Create a new flow.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "project_id": "uuid",
  "name": "PR Review Pipeline",
  "description": "Automated PR review and approval workflow",
  "status": "draft"
}
```

**Response 201**: Created flow object.

---

### GET /api/flows/templates
**Description**: Returns built-in flow templates.

**Response 200**: Array of flow template objects (steps included).

---

### POST /api/flows/from-template
**Description**: Create a new flow from a built-in template.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "template_id": "pr-review",
  "name": "My PR Review Flow"
}
```

**Response 201**: Created flow with pre-populated steps.

---

### GET /api/flows/:id
**Description**: Get a single flow with its steps.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "PR Review Pipeline",
  "status": "active",
  "steps": [
    {
      "id": "uuid",
      "name": "Code Analysis",
      "step_type": "agent",
      "position": 0,
      "agent_id": "uuid"
    },
    {
      "id": "uuid",
      "name": "Security Scan",
      "step_type": "agent",
      "position": 1,
      "agent_id": "uuid"
    }
  ]
}
```

---

### PUT /api/flows/:id
**Description**: Update flow metadata (name, description, status).

**Response 200**: Updated flow object.

---

### DELETE /api/flows/:id
**Description**: Delete a flow and all its steps and runs.

**Response 204**: No content.

---

### GET /api/flows/:id/steps
**Description**: List steps for a flow, ordered by position.

**Response 200**: Array of flow step objects.

---

### POST /api/flows/:id/steps
**Description**: Add a step to a flow.

**Request body**:
```json
{
  "name": "Code Analysis",
  "step_type": "agent",
  "agent_id": "uuid",
  "position": 0,
  "config_json": "{\"timeout\": 120}"
}
```

**Response 201**: Created step object.

---

### PUT /api/flows/steps/:id
**Description**: Update a flow step (name, agent, position, config).

**Response 200**: Updated step object.

---

### DELETE /api/flows/steps/:id
**Description**: Remove a step from a flow.

**Response 204**: No content.

---

### GET /api/flows/:id/runs
**Description**: List all runs (flow_runs) for a flow.

**Response 200**: Array of flow run objects.

---

### POST /api/flows/:id/execute
**Description**: Execute a flow. Creates a `flow_run` and dispatches it to `flowService`.

**Request body** (optional):
```json
{
  "project_id": "uuid",
  "card_id": "uuid"
}
```

**Response 202**:
```json
{
  "flow_run_id": "uuid",
  "status": "queued"
}
```

---

## 15. GitHub — `/api/github`

### GET /api/github/connections
**Description**: List GitHub connections for the workspace.

**Response 200**: Array of connection objects (`access_token_env_var` shown, no raw tokens).

---

### POST /api/github/connections
**Description**: Register a new GitHub connection.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Acme GitHub",
  "access_token_env_var": "GITHUB_TOKEN",
  "is_default": 1
}
```

**Response 201**: Created connection object.

---

### PUT /api/github/connections/:id
**Description**: Update a GitHub connection.

**Response 200**: Updated connection object.

---

### DELETE /api/github/connections/:id
**Description**: Delete a GitHub connection.

**Response 204**: No content.

---

### POST /api/github/sync-issues
**Description**: Sync open GitHub issues for a project to cards on the project's board.

**Request body**:
```json
{
  "project_id": "uuid",
  "connection_id": "uuid"
}
```

**Response 200**:
```json
{
  "synced": 12,
  "created": 8,
  "updated": 4
}
```

---

### GET /api/github/inspect
**Description**: Inspect the GitHub connection — verify credentials and return rate limit status.

**Query parameters**: `connection_id`

**Response 200**:
```json
{
  "authenticated": true,
  "login": "acme-bot",
  "rate_limit": { "limit": 5000, "remaining": 4987, "reset": 1704067200 }
}
```

---

### GET /api/github/repos
**Description**: List repositories accessible to the GitHub connection.

**Query parameters**: `connection_id`

**Response 200**: Array of `{ full_name, private, default_branch, html_url }` objects.

---

### POST /api/github/branches
**Description**: Create a branch in the project's repository.

**Request body**:
```json
{
  "project_id": "uuid",
  "connection_id": "uuid",
  "branch_name": "feature/new-login",
  "from_branch": "main"
}
```

**Response 201**: `{ "branch_name": "feature/new-login", "sha": "abc123..." }`

---

### POST /api/github/pull-requests
**Description**: Create a pull request for a run's branch.

**Request body**:
```json
{
  "run_id": "uuid",
  "project_id": "uuid",
  "connection_id": "uuid",
  "title": "feat: implement login page",
  "body": "This PR implements the login page as described in #42",
  "head": "feature/login-page",
  "base": "main"
}
```

**Response 201**: `{ "pr_number": 43, "pr_url": "https://github.com/acme/platform/pull/43" }`

---

## 16. Webhooks — `/api/webhooks`

### GET /api/webhooks
**Description**: List webhook configurations for the workspace.

**Response 200**: Array of webhook config objects (`secret` is masked).

---

### POST /api/webhooks
**Description**: Create a new webhook config.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "GitHub Push Handler",
  "flow_id": "uuid",
  "secret": "mysecret",
  "events_json": "[\"push\",\"pull_request\"]",
  "project_id": "uuid",
  "is_enabled": 1
}
```

**Response 201**: Created webhook config (secret masked in response).

---

### GET /api/webhooks/:id
**Description**: Get a single webhook config.

**Response 200**: Webhook config object.

---

### PUT /api/webhooks/:id
**Description**: Update a webhook config.

**Response 200**: Updated webhook config.

---

### DELETE /api/webhooks/:id
**Description**: Delete a webhook config.

**Response 204**: No content.

---

### POST /api/webhooks/receive/:id
**Description**: Inbound endpoint for external webhook delivery (e.g., from GitHub). Validates HMAC signature using the stored `secret`, checks the event type against `events_json`, then triggers the configured flow.

**Headers required**:
```
X-Hub-Signature-256: sha256=<hmac_hex>
X-GitHub-Event: push
```

**Request body**: Raw GitHub webhook payload (JSON).

**Response 200**: `{ "message": "Webhook received and flow queued" }`
**Response 400**: `{ "error": "Webhook disabled" }`
**Response 401**: `{ "error": "Invalid signature" }`
**Response 422**: `{ "error": "Event type not configured" }`

---

## 17. Companies — `/api/companies`

### GET /api/companies
**Description**: List companies in the workspace.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "workspace_id": "uuid",
    "name": "Acme Corp",
    "industry": "Technology",
    "company_size": "51-200",
    "contact_name": "Jane Smith",
    "contact_email": "jane@acme.com"
  }
]
```

---

### POST /api/companies
**Description**: Create a new company record.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Acme Corp",
  "description": "Enterprise software solutions",
  "website": "https://acme.com",
  "industry": "Technology",
  "company_size": "51-200",
  "contact_name": "Jane Smith",
  "contact_email": "jane@acme.com",
  "notes": "Key account since 2023"
}
```

**Response 201**: Created company object.

---

### GET /api/companies/:id
**Description**: Get a company with its associated projects.

**Response 200**: Company object plus `projects` array.

---

### PUT /api/companies/:id
**Description**: Update company details.

**Response 200**: Updated company object.

---

### DELETE /api/companies/:id
**Description**: Delete a company. Associated `company_projects` records CASCADE deleted.

**Response 204**: No content.

---

### GET /api/companies/:id/projects
**Description**: List projects associated with a company.

**Response 200**: Array of project objects.

---

### POST /api/companies/:id/projects/:projectId
**Description**: Associate a project with a company.

**Response 201**: `{ "company_id": "uuid", "project_id": "uuid" }`
**Response 409**: `{ "error": "Project already associated with this company" }`

---

### DELETE /api/companies/:id/projects/:projectId
**Description**: Remove a project association from a company.

**Response 204**: No content.

---

## 18. Settings — `/api/settings`

### GET /api/settings/workspace
**Description**: Get workspace-level settings (name, slug, and configuration values).

**Query parameters**: `workspace_id`

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /api/settings/workspace
**Description**: Update workspace settings.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "name": "Acme Corp Updated"
}
```

**Response 200**: Updated workspace object.

---

### GET /api/settings/cost-summary
**Description**: Aggregate cost summary for the workspace across all runs and chat sessions.

**Query parameters**:
- `workspace_id` — required
- `from` — ISO-8601 start date (optional)
- `to` — ISO-8601 end date (optional)

**Response 200**:
```json
{
  "total_cost_usd": 124.57,
  "total_tokens_input": 1250000,
  "total_tokens_output": 890000,
  "runs_count": 342,
  "chat_messages_count": 1204,
  "by_provider": {
    "openai": { "cost_usd": 98.20, "runs": 280 },
    "anthropic": { "cost_usd": 26.37, "runs": 62 }
  }
}
```

---

## 19. Execute — `/api/execute`

### POST /api/execute
**Description**: Direct execution endpoint — creates and immediately dispatches a run without needing an existing card. Useful for programmatic integrations and the CLI.

**Request body**:
```json
{
  "workspace_id": "uuid",
  "project_id": "uuid",
  "agent_id": "uuid",
  "prompt": "Review the authentication module for security vulnerabilities",
  "branch_name": "security-review",
  "execution_mode": "provider"
}
```

**Response 202**:
```json
{
  "run_id": "uuid",
  "status": "queued",
  "message": "Execution queued"
}
```

**Response 400**: `{ "error": "agent_id is required" }`
**Response 404**: `{ "error": "Agent not found" }`

---

> **Route coverage**: This document covers all 19 route groups mounted in the Express application: auth, workspaces, projects, boards, cards, agents, teams, providers, runtimes, skills, mcp, runs, chat, flows, github, webhooks, companies, settings, and execution.

*See also*: [Architecture Overview](01-architecture-overview.md), [Data Model](02-data-model.md), [Authentication & RBAC](04-auth-and-rbac.md), [API Client Guide](27-api-client-guide.md)
