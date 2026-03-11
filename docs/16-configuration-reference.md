# Configuration Reference

All environment variables, their defaults, and effects. Copy the relevant `.env.example` block as a starting point.

Cross-references: [Deployment Guide](15-deployment-guide.md) · [Security Hardening](19-security-hardening.md)

---

## Backend Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `./foundry.db` | Path to the SQLite database file |
| `FOUNDRY_ADMIN_PASSWORD` | (unset) | Enables JWT authentication when set; value becomes the admin password |
| `FOUNDRY_JWT_SECRET` | `foundry-dev-secret-change-in-prod` | JWT signing key — use a strong random value in production |
| `PORT` | `3001` | Backend HTTP listen port |
| `GITHUB_TOKEN` | (unset) | Global GitHub PAT fallback used when no workspace connection is configured |
| `NODE_ENV` | `development` | Environment mode; set to `production` in deployed environments |

---

## Provider API Key Variables

Provider API keys are stored by **env var name** in `provider_configs.api_key_env_var`; the actual key is read from the process environment at runtime and never written to the database.

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GOOGLE_API_KEY` | Google Gemini |
| `OPENROUTER_API_KEY` | OpenRouter |
| `MINIMAX_API_KEY` | MiniMax |
| `GLM_API_KEY` | GLM / Z.ai |
| `NVIDIA_API_KEY` | NVIDIA NIM |
| `GROQ_API_KEY` | Groq |
| `MOONSHOT_API_KEY` | Kimi / Moonshot AI |

Optional OpenRouter attribution headers:

| Variable | Description |
|---|---|
| `OPENROUTER_SITE_URL` | Your site URL for OpenRouter rankings |
| `OPENROUTER_SITE_NAME` | Your site name for OpenRouter rankings |

---

## GitHub App Variables

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY_PATH` | Filesystem path to the App private key PEM file |
| `GITHUB_INSTALLATION_ID` | GitHub App installation ID |

---

## Frontend Environment Variables

Create a `frontend/.env` file (or pass at build time):

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Backend API base URL used by the React app |

---

## Example .env Files

### Development (`backend/.env`)

```dotenv
# Database
DATABASE_PATH=./foundry.db

# Auth (comment out to disable auth entirely)
# FOUNDRY_ADMIN_PASSWORD=devpassword
# FOUNDRY_JWT_SECRET=dev-secret-only

# Server
PORT=3001
NODE_ENV=development

# Providers (add the keys you need)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# GitHub
GITHUB_TOKEN=ghp_...
```

### Production (`backend/.env`)

```dotenv
DATABASE_PATH=/var/lib/foundry/foundry.db

FOUNDRY_ADMIN_PASSWORD=a-very-strong-password
FOUNDRY_JWT_SECRET=replace-with-64-random-bytes

PORT=3001
NODE_ENV=production

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

GITHUB_TOKEN=ghp_...
```

### Frontend (`frontend/.env`)

```dotenv
VITE_API_URL=https://api.foundry.example.com
```

---

## Configuration Precedence

Environment variables always override compiled defaults. There is no config file — all configuration is through the environment.

```
process.env > compiled default
```

---

## Secrets Management

- Never commit `.env` files to git. Add them to `.gitignore`.
- In production, inject secrets via your platform's secrets manager (AWS Secrets Manager, Vault, Doppler, etc.) rather than writing them to disk.
- Rotate `FOUNDRY_JWT_SECRET` by redeploying; existing sessions will be invalidated.
