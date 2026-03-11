# Local Development Setup

This guide walks you through setting up the Foundry-Git AI Agent Orchestration platform locally.

---

## Prerequisites

- **Node.js 18+ (LTS recommended)**
- **npm 9+**
- **Git**
- *(Optional)* GitHub account for GitHub integration features

---

## Clone the Repository

```bash
git clone https://github.com/garciarsdiego/Foundry-Git.git
cd Foundry-Git
```

---

## Install Dependencies

The project is a monorepo with `workspaces` for `backend` and `frontend`. A single install from the root covers both:

```bash
npm install   # installs backend + frontend deps via workspaces
```

---

## Environment Setup

Create a `.env` file inside the `backend/` directory:

```bash
# backend/.env
DATABASE_PATH=./foundry.db
PORT=3001

# Optional: enable authentication
FOUNDRY_ADMIN_PASSWORD=your-secure-password
FOUNDRY_JWT_SECRET=your-random-secret

# Optional: GitHub integration
GITHUB_TOKEN=ghp_...
```

> **Note:** If `FOUNDRY_ADMIN_PASSWORD` and `FOUNDRY_JWT_SECRET` are not set, authentication is disabled and all API endpoints are publicly accessible. This is convenient for local development but should never be used in production.

---

## Start Development Servers

```bash
npm run dev   # starts backend (port 3001) + frontend (port 5173) concurrently
```

Both servers start in watch mode. Backend changes auto-restart via `nodemon`; frontend changes hot-reload via Vite HMR.

---

## Access the UI

Open your browser and navigate to:

```
http://localhost:5173
```

---

## First Run

On first startup the backend automatically:

1. Creates the SQLite database at the path set by `DATABASE_PATH`.
2. Runs all schema migrations (tables, indexes, CHECK constraints).
3. Inserts seed data: a default **workspace**, **project**, and **agent**.

No manual database setup is required.

---

## Walkthrough: Your First Workspace

### Create First Workspace

1. Open the UI at `http://localhost:5173`.
2. Navigate to **Settings** → **Workspaces**.
3. Click **New Workspace**, fill in a name, and save.

### Create First Project

1. Go to **Projects** in the sidebar.
2. Click **New Project**, enter a name, and optionally paste a GitHub repository URL to enable Git integration.

### Create First Agent

1. Navigate to **Agents**.
2. Click **New Agent**, choose a **Provider** (e.g., OpenAI) or a **Runtime** mode (e.g., subprocess), and fill in the required settings.

### Execute First Task

1. Open a **Board** inside your project.
2. Create a **Card** describing the task.
3. Assign the card to your agent.
4. Click **Execute** on the card.
5. Open **Queue** or the run detail page to watch real-time run events stream in.

---

## API Health Check

Confirm the backend is running:

```bash
curl http://localhost:3001/api/auth/status
```

Expected response when auth is disabled:

```json
{"authenticated": true, "authEnabled": false}
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `EADDRINUSE 3001` | Another process on port 3001 | Change `PORT` in `backend/.env` or kill the conflicting process |
| `EADDRINUSE 5173` | Another Vite dev server running | Stop it or change Vite port in `frontend/vite.config.js` |
| `SQLITE_CANTOPEN` | Missing directory for `DATABASE_PATH` | Ensure `backend/` directory is writable or change `DATABASE_PATH` |
| `401 Unauthorized` on all requests | Auth enabled but token not set | Log in via the UI or unset `FOUNDRY_ADMIN_PASSWORD` for local dev |
| Frontend shows blank page | Backend not reachable | Confirm backend is running on port 3001; check Vite proxy config |

---

## See Also

- [Deployment Guide](15-deployment-guide.md)
- [Configuration Reference](16-configuration-reference.md)
