# Foundry — AI Agent Orchestration Platform

Foundry is a full-stack platform for managing, dispatching, and monitoring AI coding agents across software projects. It provides a unified workspace to configure AI providers (OpenAI, Anthropic, Google, etc.), CLI-based runtimes (OpenCode, Codex CLI, Claude Code, Gemini CLI, etc.), agents, teams, and Kanban-based project boards where tasks are dispatched to agents and executed as trackable runs.

## Architecture

```
foundry-git/
├── backend/          # Node.js + Express + SQLite API server (port 3001)
│   ├── src/
│   │   ├── db/       # SQLite schema and connection
│   │   ├── routes/   # Express route handlers (REST API)
│   │   └── services/ # Business logic (execution, GitHub)
│   └── package.json
├── frontend/         # React + Vite + Tailwind dark theme (port 5173)
│   ├── src/
│   │   ├── pages/    # All route-level page components
│   │   └── components/ # Shared UI components + API client
│   └── package.json
└── package.json      # Workspace root with concurrently dev script
```

### Backend Stack
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express.js
- **Database**: SQLite via better-sqlite3
- **Validation**: Zod
- **GitHub API**: @octokit/rest (scaffolded)
- **Port**: 3001

### Frontend Stack
- **Framework**: React 18
- **Build tool**: Vite 6
- **Routing**: React Router v6
- **Styling**: Tailwind CSS (dark theme)
- **Icons**: lucide-react
- **Port**: 5173

## Getting Started

### Prerequisites
- Node.js 18+ (tested on v24)
- npm 9+

### Install & Run

```bash
# Install all dependencies (root + backend + frontend)
npm install

# Start both backend and frontend in development mode
npm run dev
```

The backend will start at `http://localhost:3001` and the frontend at `http://localhost:5173`. The frontend proxies all `/api` requests to the backend.

On first startup, the database is auto-initialized with a default workspace, project, board, and sample cards.

### Individual startup

```bash
# Backend only
npm run start:backend

# Frontend only
npm run start:frontend
```

## Frontend Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | DashboardPage | Stats overview and recent runs |
| `/projects` | ProjectsPage | List/create projects with GitHub repo binding |
| `/projects/:id` | ProjectDetailPage | Project detail with run history |
| `/projects/:id/board` | BoardPage | Kanban board with drag-and-drop card movement |
| `/projects/:id/board/:taskId` | TaskDetailPage | Task detail with run creation |
| `/agents` | AgentsPage | Agent configuration (provider or runtime mode) |
| `/teams` | TeamsPage | Team management with agent membership |
| `/runtimes` | RuntimesPage | CLI runtime configurations |
| `/providers` | ProvidersPage | AI provider API configurations |
| `/queue` | QueuePage | Run queue with status filtering |
| `/runs/:runId` | RunDetailPage | Run detail with live event log |
| `/settings` | SettingsPage | Workspace settings and GitHub connections |
| `/chat` | ChatPage | Chat interface with agent selection |
| `/flows` | FlowsPage | Multi-agent flow list |
| `/flows/:id` | FlowDetailPage | Flow editor with step management and run history |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/workspaces` | Workspace CRUD |
| GET/POST/PUT/DELETE | `/api/projects` | Project CRUD |
| GET/POST/PUT/DELETE | `/api/boards` | Board + column CRUD |
| GET/POST/PUT/DELETE | `/api/cards` | Card CRUD |
| POST | `/api/cards/:id/run` | Create run from card |
| GET/POST/PUT/DELETE | `/api/agents` | Agent CRUD |
| GET/POST/PUT/DELETE | `/api/teams` | Team CRUD + memberships |
| GET/POST/PUT/DELETE | `/api/runtimes` | Runtime config CRUD |
| GET/POST/PUT/DELETE | `/api/providers` | Provider config CRUD |
| GET | `/api/runs` | List runs (filterable by project/status/agent) |
| GET | `/api/runs/:id` | Run detail with events |
| POST | `/api/runs/:id/cancel` | Cancel a run |
| POST | `/api/execute` | Execute a card with an agent |
| GET/POST/PUT/DELETE | `/api/github/connections` | GitHub connection CRUD |
| POST | `/api/github/sync/:projectId` | Sync GitHub issues to cards (Octokit) |
| GET | `/api/github/repos/:connectionId` | List repos for connection (Octokit) |
| GET | `/api/github/repos/:connectionId/:owner/:repo` | Inspect a specific repo |
| POST | `/api/github/branch/:projectId/:runId` | Create branch for a run |
| POST | `/api/github/pr/:runId` | Create PR for a run |
| GET | `/api/settings` | Workspace settings summary |
| GET | `/api/health` | Health check |
| GET/POST/PUT/DELETE | `/api/flows` | Flow CRUD |
| GET/POST/PUT/DELETE | `/api/flows/:id/steps` | Flow step management |
| PUT | `/api/flows/:id/steps/reorder` | Reorder flow steps |
| POST | `/api/flows/:id/run` | Execute a flow against a card |
| GET | `/api/flows/:id/runs` | List flow run history |
| POST | `/api/chat` | Send chat message (real AI or simulated) |
| GET | `/api/chat/sessions/:sessionId` | Get chat session history |
| GET | `/api/chat/sessions` | List recent chat sessions |

## Entity Model

### Core Entities

| Entity | Description |
|--------|-------------|
| **Workspace** | Top-level namespace containing all resources |
| **Project** | A software project, optionally bound to a GitHub repo |
| **Board** | Kanban board associated with a project |
| **BoardColumn** | Column within a board (Todo, In Progress, Review, Done) |
| **Card** | Task on the board; can have a GitHub issue and an assigned agent |
| **Agent** | An AI agent config with execution mode, provider/runtime, and optional fallback |
| **Team** | Group of agents with roles |
| **Run** | A single execution of an agent on a card; tracks status and events |
| **RunEvent** | Log entry for a run (stdout, api_call, error, etc.) |
| **ProviderConfig** | API provider settings (OpenAI, Anthropic, Google, etc.) |
| **RuntimeConfig** | CLI runtime settings (Codex CLI, Claude Code, etc.) |
| **GithubConnection** | GitHub credentials for repo access |
| **ExecutionPolicy** | Retry/timeout/fallback policy |

## Runtime vs Provider

Foundry supports two agent execution models:

### Provider Mode
The agent calls an AI provider API directly:
- Supports: OpenAI, Anthropic, Google, OpenRouter, MiniMax, GLM/Z.ai
- Configuration: `provider_config_id` on the agent
- The `api_key_env_var` field names the environment variable holding the API key (key is never stored in DB)

### Runtime Mode
The agent invokes a CLI tool installed on the server. Each runtime is invoked in non-interactive (headless) mode:

| `runtime_type` | Default binary | Invocation |
|---|---|---|
| `opencode` | `opencode` | `opencode run "<prompt>"` |
| `claude-code` | `claude` | `claude -p "<prompt>"` |
| `codex` | `codex` | `codex "<prompt>"` |
| `gemini-cli` | `gemini` | `gemini -p "<prompt>"` |
| `kimi-code` | `kimi` | stdin-based |
| `kilo-code` | `kilo` | stdin-based |

> **Recommended**: [OpenCode](https://opencode.ai) with the [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) plugin lets you orchestrate Claude, GPT, Gemini, Kimi, and GLM agents from one CLI. Install OpenCode, then `bunx oh-my-opencode install` to configure multi-provider agent switching.

- Configuration: `runtime_config_id` on the agent, with optional `binary_path` and `extra_args`
- The runtime is invoked as a subprocess with stdout/stderr streamed as run events
- If the binary is not installed, execution falls back to a simulation with helpful hints

### Fallback
Any agent can have a `fallback_provider_config_id`. If runtime execution fails, the execution service will automatically retry using the fallback provider.

## What's Implemented

- ✅ Full SQLite schema with all entities (including flows, flow_steps, flow_runs, chat_messages)
- ✅ REST API for all entities (CRUD)
- ✅ Execution service with real subprocess invocation for CLI runtimes (falls back to simulation if binary not installed)
- ✅ Per-runtime non-interactive invocation flags (`claude -p`, `opencode run`, `gemini -p`, `codex` positional)
- ✅ OpenCode runtime support with [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) compatibility
- ✅ Real provider API calls for OpenAI and Anthropic (uses configured api_key_env_var)
- ✅ Execution policy enforcement: per-workspace retry and timeout configuration applied during dispatch
- ✅ Real GitHub integration via Octokit: issue sync, branch creation, PR creation, repo listing
- ✅ React frontend with all routes
- ✅ Kanban board with drag-and-drop card movement between columns
- ✅ Agent configuration with provider/runtime mode toggle
- ✅ Run detail page with live event log polling
- ✅ Dark theme UI throughout
- ✅ Default workspace seed data on first run
- ✅ Chat interface: select an agent, send messages, receive real AI responses (or simulated if no API key)
- ✅ Flow builder: create multi-agent step pipelines, run flows against cards, view run history

## TODO / Future Work

- [ ] Authentication / multi-user support
- [ ] WebSocket streaming for real-time chat and run output
- [ ] Webhook support for GitHub event-driven runs
- [ ] Visual drag-and-drop flow editor (currently step-list based)
- [ ] Google, OpenRouter, MiniMax, GLM provider dispatch (currently OpenAI and Anthropic implemented)
- [ ] Metrics and analytics dashboard

## Configuration

Copy `.env.example` to `.env` in the backend directory and configure as needed:

```bash
cd backend
cp .env.example .env
```

Key variables:
- `PORT` — backend port (default: 3001)
- `DATABASE_PATH` — SQLite file path (default: ./foundry.db)
- `OPENAI_API_KEY` — OpenAI API key (referenced by provider configs)
- `ANTHROPIC_API_KEY` — Anthropic API key
- `GITHUB_TOKEN` — GitHub personal access token (referenced by GitHub connections)
