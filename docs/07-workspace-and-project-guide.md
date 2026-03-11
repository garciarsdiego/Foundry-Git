# Workspace & Project Guide

Workspaces and projects form the top two levels of Foundry-Git's organisational hierarchy. Every resource — agents, boards, teams, providers, runs — is scoped to a workspace, and most user-facing work happens inside a project.

---

## Workspace Overview

A workspace is a **tenant namespace** that isolates all resources from other workspaces. Think of it as an organisation or account boundary.

### Schema

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `name` | TEXT | Human-readable name |
| `slug` | TEXT | URL-safe identifier, UNIQUE across all workspaces |
| `created_at` | DATETIME | Auto-set on insert |
| `updated_at` | DATETIME | Auto-updated on mutation |

### Slug Generation

Slugs are auto-generated from the workspace name at creation time:

- Lowercased
- Spaces and special characters replaced with hyphens
- Consecutive hyphens collapsed
- Leading/trailing hyphens stripped

Example: `"My Team's Workspace"` → `my-teams-workspace`

Slugs are used in URLs and must be unique. If a collision occurs, a numeric suffix is appended automatically.

---

## Creating a Workspace

### Via the UI

1. Click **New Workspace** from the workspace selector in the sidebar.
2. Enter a name. The slug preview updates live.
3. Click **Create**. You are redirected into the new workspace.

### Via the API

```http
POST /api/workspaces
Content-Type: application/json

{
  "name": "Platform Engineering"
}
```

Response:

```json
{
  "id": "ws_01J…",
  "name": "Platform Engineering",
  "slug": "platform-engineering",
  "created_at": "2025-01-15T10:00:00.000Z",
  "updated_at": "2025-01-15T10:00:00.000Z"
}
```

### Other Workspace Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workspaces` | List all workspaces |
| `GET` | `/api/workspaces/:id` | Get a single workspace |
| `PUT` | `/api/workspaces/:id` | Update name or slug |
| `DELETE` | `/api/workspaces/:id` | Delete workspace and all child resources |

---

## Project Overview

A project represents a **software project** within a workspace. It connects to a GitHub repository and contains boards, cards, and team assignments.

### Schema

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | Primary key |
| `workspace_id` | TEXT | FK → workspaces.id |
| `name` | TEXT | Human-readable project name |
| `slug` | TEXT | URL-safe identifier, UNIQUE per workspace |
| `description` | TEXT | Optional project description |
| `repo_url` | TEXT | Full GitHub repository URL |
| `repo_owner` | TEXT | GitHub owner (user or org) |
| `repo_name` | TEXT | GitHub repository name |
| `default_branch` | TEXT | Default `main`; used for branch/PR creation |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-updated |

`UNIQUE(workspace_id, slug)` is enforced at the database level.

---

## GitHub Repository Binding

When a project is linked to a GitHub repository, `repo_owner` and `repo_name` are stored separately and used throughout the platform:

- **Issue sync**: `GET /api/github/repos/:owner/:repo/issues` pulls open issues and creates/updates cards on the linked board.
- **Branch creation**: new feature branches are created under `repo_owner/repo_name`.
- **PR creation**: pull requests target the project's `default_branch`.

Binding a repo is optional. Projects without a repo binding can still use boards, cards, and agents — they simply won't have GitHub integration features.

### Setting the Default Branch

`default_branch` defaults to `'main'`. Change it if your repository uses a different default (e.g. `master`, `develop`):

```http
PUT /api/projects/:id
{ "default_branch": "develop" }
```

---

## Creating a Project

### Via the UI

1. Navigate to **Projects** in the left sidebar.
2. Click **New Project**.
3. Fill in the name, optional description, and GitHub repo URL.
4. Click **Create Project**. You are taken to the project detail page.

### Via the API

```http
POST /api/projects
Content-Type: application/json

{
  "workspace_id": "ws_01J…",
  "name": "API Gateway",
  "description": "Core API gateway service",
  "repo_url": "https://github.com/acme/api-gateway",
  "repo_owner": "acme",
  "repo_name": "api-gateway",
  "default_branch": "main"
}
```

### Other Project Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects (filter by `workspace_id`) |
| `GET` | `/api/projects/:id` | Get a single project |
| `PUT` | `/api/projects/:id` | Update project fields |
| `DELETE` | `/api/projects/:id` | Delete project and its boards/cards |

---

## Project–Team Associations

Teams are linked to projects via the `project_teams` join table:

```sql
project_teams (
  project_id TEXT REFERENCES projects(id),
  team_id    TEXT REFERENCES teams(id),
  PRIMARY KEY (project_id, team_id)
)
```

Assigning a team to a project allows its agents to be selected when executing cards on that project's boards.

```http
POST /api/projects/:id/teams
{ "team_id": "team_01J…" }

DELETE /api/projects/:id/teams/:teamId
```

---

## Board Creation

Each project can have one or more **kanban boards** — see [Board & Card Workflow](08-board-and-card-workflow.md) for full details.

Quick start:

```http
POST /api/boards
{
  "project_id": "proj_01J…",
  "name": "Sprint 1"
}
```

The board is created with a default set of columns: **Backlog**, **Todo**, **In Progress**, **In Review**, **Done**.

---

## UI Walkthrough

```
Workspace Selector
  └─ New Workspace → name → Create
      └─ Projects (sidebar)
          └─ New Project → name + repo URL → Create
              └─ Project Detail
                  ├─ Boards tab → New Board → column setup
                  ├─ Teams tab  → Assign Team
                  └─ Settings   → edit repo, default branch
```

---

## Related Documentation

- [Board & Card Workflow](08-board-and-card-workflow.md) — boards, columns, cards, execution
- [Team Hierarchy](10-team-hierarchy.md) — creating teams and assigning them to projects
- [GitHub Integration](13-github-integration.md) — issue sync, PR creation, webhooks
