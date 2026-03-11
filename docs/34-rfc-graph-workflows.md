# RFC: Graph Workflows (DAG Model)

**Status**: Proposed  
**See also**: [Roadmap Overview](31-roadmap-overview.md) · [Flow Builder](11-flow-builder.md) · [Event & Run Lifecycle](06-event-and-run-lifecycle.md)

## Problem

Current flows are linear: steps execute in ascending `position` order. This model cannot represent:
- Conditional branching ("if tests pass → deploy, else → notify")
- Fan-out / fan-in (multiple agents in parallel converging at a merge node)
- Complex multi-path workflows

## Proposal

Introduce `workflow_nodes` and `workflow_edges` tables to represent flows as Directed Acyclic Graphs (DAGs). The existing linear model is preserved behind a `graph_enabled` toggle.

## Schema Changes

```sql
-- Enable graph mode per flow
ALTER TABLE flows ADD COLUMN graph_enabled INTEGER NOT NULL DEFAULT 0;

-- Nodes replace flow_steps for graph flows
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id          TEXT PRIMARY KEY,
  flow_id     TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  node_type   TEXT NOT NULL CHECK(node_type IN ('start','agent','condition','parallel','merge','end')),
  agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  config_json TEXT,          -- node-specific configuration
  position_x  REAL NOT NULL DEFAULT 0,
  position_y  REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Directed edges between nodes
CREATE TABLE IF NOT EXISTS workflow_edges (
  id             TEXT PRIMARY KEY,
  flow_id        TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  condition      TEXT,   -- expression string evaluated at runtime
  label          TEXT,   -- display label e.g. "on success", "on failure"
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## DAG Execution Algorithm

```
1. Find the 'start' node
2. Topological sort of reachable nodes (BFS/DFS)
3. For each node in topological order:
   a. 'agent'    → createRun + dispatchRun (await)
   b. 'parallel' → dispatch all outgoing agent edges concurrently (Promise.all)
   c. 'condition'→ evaluate condition expression, follow matching edge
   d. 'merge'    → wait for all incoming parallel branches
   e. 'end'      → mark flow_run success
4. On any unhandled error → mark flow_run failed
```

## Visual Canvas Editor

Use [React Flow](https://reactflow.dev/) in the frontend:
- Drag-and-drop nodes onto a canvas
- Draw edges between node handles
- Node palette: start, agent, condition, parallel, merge, end
- Node config panel opens on click (select agent, set condition expression)
- Canvas persists `position_x`/`position_y` per node

## Backward Compatibility

- `graph_enabled = 0` (default): `dispatchFlowRun()` uses the existing linear `flow_steps` execution path unchanged
- `graph_enabled = 1`: new `dispatchGraphFlowRun()` function handles DAG execution

## Migration from Linear Steps

```js
// Utility: convert existing flow_steps to workflow_nodes/edges
function migrateFlowToGraph(flowId) {
  const steps = db.prepare('SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY position').all(flowId);
  // Create start node
  // For each step: create agent/condition/parallel node
  // Chain them with sequential edges
  // Create end node
  // Set flows.graph_enabled = 1
}
```

## Implementation Steps

1. Schema additions + `CREATE TABLE IF NOT EXISTS` in `schema.sql`
2. Add `addColumnIfMissing('flows', 'graph_enabled', 'INTEGER NOT NULL DEFAULT 0')` in migrations
3. Implement `dispatchGraphFlowRun()` in `flowService.js`
4. Add API endpoints: `GET/POST /api/flows/:id/nodes`, `GET/POST /api/flows/:id/edges`
5. Frontend: add React Flow canvas to `FlowBuilderPage`
