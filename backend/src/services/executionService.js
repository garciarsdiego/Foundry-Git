import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
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

  // Load execution policy if one is associated with the agent's workspace
  const policy = db.prepare(
    `SELECT ep.* FROM execution_policies ep
     JOIN agents a ON a.workspace_id = ep.workspace_id
     WHERE a.id = ? LIMIT 1`
  ).get(run.agent_id);

  const maxRetries = policy?.max_retries ?? 0;
  const timeoutSeconds = policy?.timeout_seconds ?? 300;

  db.prepare(`UPDATE runs SET status = 'running', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(runId);
  await logEvent(runId, 'started', 'Run dispatched and started');

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      await logEvent(runId, 'retry', `Retry attempt ${attempt} of ${maxRetries}`);
    }
    try {
      if (agent.execution_mode === 'runtime' && agent.runtime_config_id) {
        const runtimeConfig = db.prepare('SELECT * FROM runtime_configs WHERE id = ?').get(agent.runtime_config_id);
        await withTimeout(runtimeDispatch(run, agent, runtimeConfig), timeoutSeconds * 1000, runId);
      } else {
        const providerConfig = agent.provider_config_id
          ? db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(agent.provider_config_id)
          : null;
        await withTimeout(providerDispatch(run, agent, providerConfig), timeoutSeconds * 1000, runId);
      }
      // Success — stop retrying
      return;
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt > maxRetries) {
        break;
      }
    }
  }

  // All attempts failed — try fallback provider if configured
  await handleRuntimeFailure(run, lastError, agent);
}

async function withTimeout(promise, ms, runId) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Execution timed out after ${ms / 1000}s`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runtimeDispatch(run, agent, runtimeConfig) {
  const db = getDb();
  const binaryPath = runtimeConfig?.binary_path || runtimeConfig?.runtime_type || 'unknown-runtime';

  await logEvent(run.id, 'runtime_dispatch', `Dispatching to runtime: ${runtimeConfig?.runtime_type}`, {
    binary_path: binaryPath,
    runtime_type: runtimeConfig?.runtime_type,
  });

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(run.card_id);
  const extraArgs = runtimeConfig?.extra_args
    ? runtimeConfig.extra_args.split(/\s+/).filter(Boolean)
    : [];

  const taskPrompt = [
    card?.title ? `Task: ${card.title}` : '',
    card?.description ? `Description: ${card.description}` : '',
    agent?.system_prompt ? `Instructions: ${agent.system_prompt}` : '',
  ].filter(Boolean).join('\n\n');

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(binaryPath, extraArgs, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (spawnErr) {
      // Binary not found or not executable — fall back to simulated output
      return simulateRuntimeExecution(run, runtimeConfig).then(resolve).catch(reject);
    }

    if (taskPrompt && child.stdin.writable) {
      child.stdin.write(taskPrompt + '\n');
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        logEvent(run.id, 'stdout', line);
      }
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        logEvent(run.id, 'stderr', line);
      }
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT' || err.code === 'EACCES') {
        // Binary not found — fall back to simulated execution
        simulateRuntimeExecution(run, runtimeConfig).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        db.prepare(`
          UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
        `).run(run.id);
        logEvent(run.id, 'success', 'Runtime execution completed successfully').then(resolve);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function simulateRuntimeExecution(run, runtimeConfig) {
  const db = getDb();
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Initializing agent environment...`);
  await sleep(300);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Loading task context from card...`);
  await sleep(400);
  await logEvent(run.id, 'stdout', `[${runtimeConfig?.runtime_type}] Execution complete (binary not installed; simulated).`);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Runtime execution completed (simulated — install the CLI binary to run for real)');
}

export async function providerDispatch(run, agent, providerConfig) {
  const db = getDb();

  await logEvent(run.id, 'provider_dispatch', `Dispatching to provider: ${providerConfig?.provider_type || 'unknown'}`, {
    provider_type: providerConfig?.provider_type,
    model: providerConfig?.model,
  });

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(run.card_id);
  const apiKeyEnvVar = providerConfig?.api_key_env_var;
  const apiKey = apiKeyEnvVar ? process.env[apiKeyEnvVar] : null;

  if (apiKey && providerConfig?.provider_type === 'openai') {
    await openaiDispatch(run, agent, providerConfig, card, apiKey);
  } else if (apiKey && providerConfig?.provider_type === 'anthropic') {
    await anthropicDispatch(run, agent, providerConfig, card, apiKey);
  } else {
    // No API key or unsupported provider — simulate
    await simulateProviderExecution(run, providerConfig);
  }
}

async function openaiDispatch(run, agent, providerConfig, card, apiKey) {
  const db = getDb();
  const model = providerConfig.model || 'gpt-4o-mini';
  const baseUrl = providerConfig.base_url || 'https://api.openai.com';
  const messages = buildMessages(agent, card);

  await logEvent(run.id, 'api_call', `Calling OpenAI API (${model})...`);

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  await logEvent(run.id, 'api_response', 'Received response from OpenAI');
  await logEvent(run.id, 'stdout', content);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Provider execution completed successfully');
}

async function anthropicDispatch(run, agent, providerConfig, card, apiKey) {
  const db = getDb();
  const model = providerConfig.model || 'claude-3-haiku-20240307';
  const baseUrl = providerConfig.base_url || 'https://api.anthropic.com';
  const messages = buildMessages(agent, card);

  await logEvent(run.id, 'api_call', `Calling Anthropic API (${model})...`);

  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemMessage || undefined,
      messages: userMessages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  await logEvent(run.id, 'api_response', 'Received response from Anthropic');
  await logEvent(run.id, 'stdout', content);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Provider execution completed successfully');
}

function buildMessages(agent, card) {
  const messages = [];
  if (agent?.system_prompt) {
    messages.push({ role: 'system', content: agent.system_prompt });
  }
  const userContent = [
    card?.title ? `Task: ${card.title}` : '',
    card?.description ? `Description: ${card.description}` : '',
  ].filter(Boolean).join('\n\n');
  messages.push({ role: 'user', content: userContent || 'Execute the assigned task.' });
  return messages;
}

async function simulateProviderExecution(run, providerConfig) {
  const db = getDb();
  await sleep(300);
  await logEvent(run.id, 'api_call', `Calling ${providerConfig?.provider_type || 'provider'} API with model ${providerConfig?.model || 'default'}...`);
  await sleep(800);
  await logEvent(run.id, 'api_response', 'Received response from provider API (simulated — set api_key_env_var to use a real key)');
  await sleep(200);
  await logEvent(run.id, 'stdout', 'Processing agent output...');
  await sleep(300);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0, updated_at = datetime('now') WHERE id = ?
  `).run(run.id);
  await logEvent(run.id, 'success', 'Provider execution completed (simulated)');
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
