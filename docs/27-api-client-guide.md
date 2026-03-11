# API Client Guide

How to interact with the Foundry API programmatically using `curl` or JavaScript.

---

## 1. Authentication Flow

All API endpoints (except the webhook receiver) require a JWT Bearer token.

```bash
# Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}' | jq -r '.token')

# Use token in subsequent requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/workspaces
```

Tokens are short-lived. Re-authenticate when you receive `401 Unauthorized`.

---

## 2. Common CRUD Patterns

### List Workspaces

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/workspaces
```

### Create Workspace

```bash
curl -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Workspace"}'
```

### Create Project

```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"<workspace-uuid>","name":"My Project"}'
```

### Create Agent (provider mode)

```bash
curl -X POST http://localhost:3001/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "<workspace-uuid>",
    "name": "My Agent",
    "execution_mode": "provider",
    "provider": "openai",
    "model": "gpt-4o",
    "system_prompt": "You are a helpful assistant."
  }'
```

### Create Provider Config

```bash
curl -X POST http://localhost:3001/api/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "<workspace-uuid>",
    "provider": "openai",
    "api_key_env_var": "OPENAI_API_KEY",
    "is_enabled": 1
  }'
```

### Create Card

```bash
curl -X POST http://localhost:3001/api/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": "<board-uuid>",
    "column_id": "<column-uuid>",
    "title": "Implement feature X",
    "description": "Build the new feature"
  }'
```

### Assign Agent to Card

```bash
curl -X PUT http://localhost:3001/api/cards/<card-uuid> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"<agent-uuid>"}'
```

---

## 3. Executing Runs

```bash
# Execute a run for a card with an agent
curl -X POST http://localhost:3001/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_id":"<card-uuid>","agent_id":"<agent-uuid>"}'
```

Response:

```json
{
  "run_id": "<run-uuid>",
  "status": "pending"
}
```

---

## 4. Streaming Run Events (SSE)

Run events are streamed in real-time via Server-Sent Events:

```bash
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/runs/<run-uuid>/events
```

Each event line:

```
data: {"type":"stdout","content":"Installing dependencies...\n","timestamp":"2024-01-01T00:00:00Z"}
data: {"type":"stderr","content":"warning: ...","timestamp":"2024-01-01T00:00:01Z"}
data: {"type":"completed","exit_code":0,"cost_usd":0.0042}
```

---

## 5. Chat API

### Send a Chat Message

```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-1",
    "agent_id": "<agent-uuid>",
    "content": "Hello, what can you help me with?",
    "workspace_id": "<workspace-uuid>"
  }'
```

Response:

```json
{
  "message_id": "<uuid>",
  "role": "assistant",
  "content": "I can help you with...",
  "tokens_input": 12,
  "tokens_output": 45,
  "cost_usd": 0.0003
}
```

### List Chat History

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/chat/messages?session_id=session-1"
```

---

## 6. Webhook Setup

```bash
# Create webhook config
curl -X POST http://localhost:3001/api/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "<workspace-uuid>",
    "name": "My GitHub Webhook",
    "flow_id": "<flow-uuid>",
    "secret": "mysecret",
    "events_json": "[\"push\",\"pull_request\"]",
    "is_enabled": 1
  }'
```

Response includes `secret_set: true` — the secret is never echoed back.

---

## 7. JavaScript / Node.js Client Example

```javascript
const BASE_URL = 'http://localhost:3001/api';
let token;

async function login(password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  token = data.token;
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// Usage
await login('your-password');
const workspaces = await get('/workspaces');
const agent = await post('/agents', {
  workspace_id: workspaces[0].id,
  name: 'My Agent',
  execution_mode: 'provider',
  provider: 'openai',
  model: 'gpt-4o'
});
```

---

## 8. Error Handling

All errors follow a consistent format:

```json
{ "error": "Descriptive error message" }
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request / validation error |
| `401` | Missing or invalid JWT token |
| `403` | Forbidden — insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate name) |
| `500` | Internal server error |

Always check the `error` field in the response body for a human-readable description.

---

## Cross-References

- [API Reference](03-api-reference.md)
- [Authentication & RBAC](04-auth-and-rbac.md)
