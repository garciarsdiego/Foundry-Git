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
  const runtimeType = runtimeConfig?.runtime_type;
  const binaryPath = runtimeConfig?.binary_path || getDefaultBinary(runtimeType);

  await logEvent(run.id, 'runtime_dispatch', `Dispatching to runtime: ${runtimeType}`, {
    binary_path: binaryPath,
    runtime_type: runtimeType,
  });

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(run.card_id);
  const taskPrompt = [
    card?.title ? `Task: ${card.title}` : '',
    card?.description ? `Description: ${card.description}` : '',
    agent?.system_prompt ? `Instructions: ${agent.system_prompt}` : '',
  ].filter(Boolean).join('\n\n') || 'Execute the assigned task.';

  // Build CLI args using the correct non-interactive flag for each runtime
  const { args, useStdin } = buildRuntimeArgs(runtimeType, taskPrompt, runtimeConfig?.extra_args);

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(binaryPath, args, {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (spawnErr) {
      return simulateRuntimeExecution(run, runtimeConfig).then(resolve).catch(reject);
    }

    if (useStdin && child.stdin.writable) {
      child.stdin.write(taskPrompt + '\n');
      child.stdin.end();
    } else if (child.stdin.writable) {
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

/**
 * Returns the default binary name for a given runtime type.
 * These match the standard installation names for each CLI tool.
 */
function getDefaultBinary(runtimeType) {
  const defaults = {
    'codex': 'codex',
    'claude-code': 'claude',
    'gemini-cli': 'gemini',
    'kimi-code': 'kimi',
    'kilo-code': 'kilo',
    'opencode': 'opencode',
  };
  return defaults[runtimeType] || runtimeType;
}

/**
 * Builds the correct CLI arguments for non-interactive (headless) execution.
 *
 * Reference: https://github.com/code-yeongyu/oh-my-openagent
 *
 * - claude (Claude Code):    claude -p "<prompt>"
 * - codex (Codex CLI):       codex "<prompt>"
 * - gemini (Gemini CLI):     gemini -p "<prompt>"
 * - opencode (OpenCode):     opencode run "<prompt>"
 * - kimi-code:               stdin-based (no standard -p flag documented)
 * - kilo-code:               stdin-based
 */
function buildRuntimeArgs(runtimeType, prompt, extraArgsStr) {
  const extra = extraArgsStr ? extraArgsStr.split(/\s+/).filter(Boolean) : [];

  switch (runtimeType) {
    case 'claude-code':
      // Claude Code: claude -p "prompt" [extra_args]
      return { args: ['-p', prompt, ...extra], useStdin: false };

    case 'codex':
      // Codex CLI: codex "prompt" [extra_args]
      return { args: [prompt, ...extra], useStdin: false };

    case 'gemini-cli':
      // Gemini CLI: gemini -p "prompt" [extra_args]
      return { args: ['-p', prompt, ...extra], useStdin: false };

    case 'opencode':
      // OpenCode: opencode run "prompt" [extra_args]
      return { args: ['run', prompt, ...extra], useStdin: false };

    case 'kimi-code':
    case 'kilo-code':
    default:
      // For CLIs without a documented headless flag, pass prompt via stdin
      return { args: [...extra], useStdin: true };
  }
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
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;
  const costUsd = estimateCost(model, tokensIn, tokensOut);

  await logEvent(run.id, 'api_response', `Received response from OpenAI (${tokensIn} in / ${tokensOut} out tokens, $${costUsd.toFixed(6)})`);
  await logEvent(run.id, 'stdout', content);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0,
      tokens_input = tokens_input + ?, tokens_output = tokens_output + ?, cost_usd = cost_usd + ?,
      updated_at = datetime('now') WHERE id = ?
  `).run(tokensIn, tokensOut, costUsd, run.id);
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
  const tokensIn = data.usage?.input_tokens || 0;
  const tokensOut = data.usage?.output_tokens || 0;
  const costUsd = estimateCost(model, tokensIn, tokensOut);

  await logEvent(run.id, 'api_response', `Received response from Anthropic (${tokensIn} in / ${tokensOut} out tokens, $${costUsd.toFixed(6)})`);
  await logEvent(run.id, 'stdout', content);

  db.prepare(`
    UPDATE runs SET status = 'success', finished_at = datetime('now'), exit_code = 0,
      tokens_input = tokens_input + ?, tokens_output = tokens_output + ?, cost_usd = cost_usd + ?,
      updated_at = datetime('now') WHERE id = ?
  `).run(tokensIn, tokensOut, costUsd, run.id);
  await logEvent(run.id, 'success', 'Provider execution completed successfully');
}

/**
 * Estimates cost in USD based on model and token counts.
 * Prices are approximate (per million tokens) as of mid-2025.
 */
export function estimateCost(model, tokensIn, tokensOut) {
  const m = (model || '').toLowerCase();

  // OpenAI models
  if (m.includes('gpt-5') || m.includes('gpt5')) return (tokensIn * 2.50 + tokensOut * 10.0) / 1_000_000;
  if (m.includes('gpt-4o-mini')) return (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
  if (m.includes('gpt-4o')) return (tokensIn * 2.50 + tokensOut * 10.0) / 1_000_000;
  if (m.includes('gpt-4-turbo') || m.includes('gpt-4-1106') || m.includes('gpt-4-0125')) return (tokensIn * 10.0 + tokensOut * 30.0) / 1_000_000;
  if (m.includes('gpt-4')) return (tokensIn * 30.0 + tokensOut * 60.0) / 1_000_000;
  if (m.includes('gpt-3.5')) return (tokensIn * 0.50 + tokensOut * 1.50) / 1_000_000;
  if (m.includes('o4-mini') || m.includes('o3-mini')) return (tokensIn * 1.10 + tokensOut * 4.40) / 1_000_000;
  if (m.includes('o4') || m.includes('o3')) return (tokensIn * 10.0 + tokensOut * 40.0) / 1_000_000;

  // Anthropic models
  if (m.includes('claude-opus-4') || m.includes('claude-4-opus')) return (tokensIn * 15.0 + tokensOut * 75.0) / 1_000_000;
  if (m.includes('claude-sonnet-4') || m.includes('claude-4-sonnet')) return (tokensIn * 3.0 + tokensOut * 15.0) / 1_000_000;
  if (m.includes('claude-haiku-4') || m.includes('claude-4-haiku')) return (tokensIn * 0.25 + tokensOut * 1.25) / 1_000_000;
  if (m.includes('claude-3-5-sonnet') || m.includes('claude-3.5-sonnet')) return (tokensIn * 3.0 + tokensOut * 15.0) / 1_000_000;
  if (m.includes('claude-3-opus')) return (tokensIn * 15.0 + tokensOut * 75.0) / 1_000_000;
  if (m.includes('claude-3-sonnet')) return (tokensIn * 3.0 + tokensOut * 15.0) / 1_000_000;
  if (m.includes('claude-3-haiku') || m.includes('claude-haiku')) return (tokensIn * 0.25 + tokensOut * 1.25) / 1_000_000;
  if (m.includes('claude')) return (tokensIn * 3.0 + tokensOut * 15.0) / 1_000_000;

  // Google models
  if (m.includes('gemini-3-pro') || m.includes('gemini-2.5-pro')) return (tokensIn * 1.25 + tokensOut * 10.0) / 1_000_000;
  if (m.includes('gemini-3-flash') || m.includes('gemini-2.5-flash')) return (tokensIn * 0.075 + tokensOut * 0.30) / 1_000_000;
  if (m.includes('gemini')) return (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;

  // Default: assume a mid-range cost
  return (tokensIn * 1.0 + tokensOut * 3.0) / 1_000_000;
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
