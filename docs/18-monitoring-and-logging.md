# Monitoring and Logging

Cross-references: [Event & Run Lifecycle](06-event-and-run-lifecycle.md) · [RFC: Observability](38-rfc-observability.md)

---

## Run Events as Audit Log

The `run_events` table is the primary audit trail for all agent execution. Every significant moment in a run's lifecycle is recorded as an event row.

| Field | Description |
|---|---|
| `id` | UUID |
| `run_id` | Parent run |
| `event_type` | See event types below |
| `message` | Human-readable description |
| `metadata_json` | Structured payload (token counts, provider info, etc.) |
| `created_at` | Timestamp |

---

## Event Types

| Event Type | When emitted |
|---|---|
| `created` | Run record inserted |
| `started` | Execution dispatched |
| `retry` | Retry attempt initiated |
| `stdout` | Line written to standard output by the runtime |
| `stderr` | Line written to standard error |
| `runtime_dispatch` | Dispatching to a code execution runtime |
| `provider_dispatch` | Calling an LLM provider API |
| `api_call` | External API call initiated |
| `api_response` | Provider response received (includes token counts) |
| `fallback` | Falling back to an alternate provider |
| `completed` | Run finished successfully |
| `failed` | Run finished with an error |
| `timeout` | Run exceeded its timeout budget |
| `cancelled` | Run cancelled by a user |

---

## Cost Tracking

### Per Run
- `runs.tokens_input` — prompt tokens
- `runs.tokens_output` — completion tokens
- `runs.cost_usd` — estimated USD cost

### Per Chat Message
- `chat_messages.tokens_input`
- `chat_messages.tokens_output`
- `chat_messages.cost_usd`

### Workspace Aggregate

```http
GET /api/settings/cost-summary
```

Returns total tokens and cost rolled up across all runs and chat messages for the workspace.

### Agent Budget Monitoring

Each agent has an optional `monthly_budget_usd` field. Compare it against the aggregated `cost_usd` from `runs` to detect budget overruns.

---

## SSE Streaming for Real-Time Logs

Subscribe to a run's event stream as it executes:

```http
GET /api/runs/:id/events
Accept: text/event-stream
```

Each `run_event` row is pushed as an SSE event the moment it is written, allowing the UI to display live output without polling.

---

## Console Logging

The backend uses `console.log`, `console.warn`, and `console.error` for process-level logging. Key patterns:

- **Startup**: schema init, migration steps, seed data results.
- **Request errors**: `console.error` in route catch blocks before `res.status(500)`.
- **Provider calls**: timing and token summaries at debug level.

Redirect stdout/stderr to a log aggregator in production (see [Log Aggregation](#log-aggregation-recommendations)).

---

## Error Handling Patterns

All Express route handlers follow this pattern:

```js
try {
  // ...
} catch (err) {
  console.error(err);
  res.status(500).json({ error: err.message });
}
```

Errors are surfaced to the client as `{ "error": "..." }` JSON with a `500` status.

---

## Run Status Dashboard

The **Queue** page in the UI lists active and recently completed runs. It shows:

- Run status badge
- Agent name and card title
- Token count and cost
- Links to the full event log

---

## Flow Run Tracking

`flow_runs.current_step_id` always reflects the step currently executing. Poll `GET /api/flows/:id/runs` or subscribe to SSE to follow progress.

---

## Health Endpoint

```http
GET /api/auth/status
```

Returns `{ "authEnabled": true|false }` — a lightweight probe with no database writes. Use it as a liveness check in container orchestration.

---

## Log Aggregation Recommendations

Forward the Node.js process stdout/stderr to your preferred aggregator:

| Platform | Method |
|---|---|
| ELK Stack | Filebeat agent tailing the log file or Docker log driver |
| Datadog | `dd-trace` or Docker log driver `datadog` |
| Grafana Loki | Promtail or Docker plugin |
| AWS CloudWatch | `awslogs` Docker log driver |

Structured JSON logging (e.g. via `pino`) would make log queries more powerful — see [RFC: Observability](38-rfc-observability.md) for the planned enhancement.
