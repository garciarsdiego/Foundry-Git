import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

export async function createRun(cardId, agentId, options = {}) {
  const db = getDb();

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  let runtimeType = null;
  let providerType = null;

  if (agent.execution_mode === 'runtime' && agent.runtime_config_id) {
    const rc = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(agent.runtime_config_id);
    runtimeType = rc?.runtime_type || null;
  } else if (agent.provider_config_id) {
    const pc = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(agent.provider_config_id);
    providerType = pc?.provider_type || null;
  }

  const runId = uuidv4();
  db.prepare(`
    INSERT INTO runs (id, project_id, card_id, agent_id, status, runtime_type, provider_type)
    VALUES (?, ?, ?, ?, 'queued', ?, ?)
  `).run(runId, card.project_id, cardId, agentId, runtimeType, providerType);

  await logEvent(runId, 'created', `Run created for card "${card.title}" using agent "${agent.name}"`);

  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  return run;
}

export async function dispatchRun(runId) {
  const db = getDb();

  const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId);
  if (!run) throw new Error(`Run ${runId} not found`);

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(run.agent_id);
  if (!agent) throw new Error(`Agent ${run.agent_id} not found`);

  db.prepare(`UPDATE runs SET status = 'running', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(runId);
  await logEvent(runId, 'started', 'Run dispatched and started');

  try {
    if (agent.execution_mode === 'runtime' && agent.runtime_config_id) {
      const runtimeConfig = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(agent.runtime_config_id);
      await runtimeDispatch(run, agent, runtimeConfig);
    } else {
      const providerConfig = agent.provider_config_id
        ? db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(agent.provider_config_id)
        : null;
      await providerDispatch(run, agent, providerConfig);
    }
  } catch (err) {
    await handleRuntimeFailure(run, err, agent);
  }
}

export async function runtimeDispatch(run, agent, runtimeConfig) {
  const db = getDb();
  const binaryPath = runtimeConfig?.binary_path || runtimeConfig?.runtime_type || 'unknown-runtime';

  await logEvent(run.id, 'runtime_dispatch', `Dispatching to runtime: ${runtimeConfig?.runtime_type}`, {
    binary_path: binaryPath,
    runtime_type: runtimeConfig?.runtime_type,
  });

  // Simulate CLI execution steps
  await sleep(500);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Initializing agent environment...`);
  await sleep(300);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Loading task context from card...`);
  await sleep(400);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Task: ${run.card_id}`);
  await sleep(600);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Execution complete (simulated).`);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Runtime execution completed successfully');
}

export async function providerDispatch(run, agent, providerConfig) {
  const db = getDb();

  await logEvent(run.id, 'provider_dispatch', `Dispatching to provider: ${providerConfig?.provider_type || 'unknown'}`, {
    provider_type: providerConfig?.provider_type,
    model: providerConfig?.model,
  });

  // Simulate API execution steps
  await sleep(300);
  await logEvent(run.id, 'api_call', `Calling ${providerConfig?.provider_type || 'provider'} API with model ${providerConfig?.model || 'default'}...`);
  await sleep(800);
  await logEvent(run.id, 'api_response', 'Received response from provider API (simulated)');
  await sleep(200);
  await logEvent(run.id, 'stdout', 'Processing agent output...');
  await sleep(300);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Provider execution completed successfully');
}

export async function handleRuntimeFailure(run, error, agent) {
  const db = getDb();
  await logEvent(run.id, 'error', `Execution failed: ${error.message}`);

  // Attempt fallback to provider if configured
  if (agent.fallback_provider_config_id) {
    await logEvent(run.id, 'fallback', 'Attempting fallback to provider...');
    try {
      const fallbackProvider = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(agent.fallback_provider_config_id);
      await providerDispatch(run, agent, fallbackProvider);
      return;
    } catch (fallbackErr) {
      await logEvent(run.id, 'error', `Fallback also failed: ${fallbackErr.message}`);
    }
  }

  db.prepare(`
    UPDATE runs SET status = 'failed', finished_at = datetime('now'), exit_code = 1, error_message = ?, updated_at = datetime('now') WHERE id = ?
  `).run(error.message, run.id);
}

export async function logEvent(runId, eventType, message, metadata = null) {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO run_events (id, run_id, event_type, message, metadata_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, runId, eventType, message, metadata ? JSON.stringify(metadata) : null);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
