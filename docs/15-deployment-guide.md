# Deployment Guide

Cross-references: [Configuration Reference](16-configuration-reference.md) · [Local Dev Setup](20-local-dev-setup.md) · [Security Hardening](19-security-hardening.md)

## Prerequisites

- Node.js 18+
- npm 9+
- Git

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_PATH` | Optional | `./foundry.db` | Path to SQLite file |
| `FOUNDRY_ADMIN_PASSWORD` | Optional | (unset) | Enables JWT auth when set |
| `FOUNDRY_JWT_SECRET` | Optional | `foundry-dev-secret-change-in-prod` | JWT signing secret — **change in production** |
| `AUTH_ENABLED` | — | Derived | Set automatically when `FOUNDRY_ADMIN_PASSWORD` is present; do not set directly |
| `GITHUB_TOKEN` | Optional | (unset) | GitHub PAT fallback |
| `PORT` | Optional | `3001` | Backend HTTP port |
| `VITE_API_URL` | Optional (frontend) | `http://localhost:3001` | Backend API base URL |

## npm Workspaces Setup

```bash
npm install           # install all workspace dependencies
npm run dev           # run backend (nodemon) + frontend (Vite) concurrently
npm run start:backend    # production backend
npm run start:frontend   # production frontend (Vite preview)
```

## Development Mode

`npm run dev` uses `concurrently` to start:
- **Backend**: `node --watch src/index.js` on port 3001
- **Frontend**: Vite dev server (default port 5173) with HMR

## Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist/
```

Serve `frontend/dist/` with nginx or any static file server. Run the backend with:

```bash
NODE_ENV=production npm run start:backend
```

## SQLite File Location

The database defaults to `./foundry.db` in the working directory. Set `DATABASE_PATH` to an absolute path for predictable placement:

```bash
DATABASE_PATH=/var/lib/foundry/foundry.db
```

## First Launch

On first start the backend:
1. Creates all tables from the embedded schema.
2. Runs idempotent migrations.
3. Inserts seed data (default workspace, project, agent).
4. Creates an admin user from `FOUNDRY_ADMIN_PASSWORD` if set.

## Docker Considerations

Run as a single container. Mount a volume to persist the database:

```dockerfile
docker run -d \
  -p 3001:3001 \
  -v /data/foundry:/data \
  -e DATABASE_PATH=/data/foundry.db \
  -e FOUNDRY_ADMIN_PASSWORD=changeme \
  -e FOUNDRY_JWT_SECRET=your-strong-secret \
  foundry-git:latest
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name foundry.example.com;

    root /var/www/foundry/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Health Check

```http
GET /api/auth/status
```

Returns `{ "authEnabled": true|false }`. Use this as a lightweight liveness probe.
