import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// Get chat history for a session
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const db = getDb();
    const messages = db.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    ).all(req.params.sessionId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List recent sessions
router.get('/sessions', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    const sessions = db.prepare(`
      SELECT session_id, agent_id, MAX(created_at) as last_message_at, COUNT(*) as message_count
      FROM chat_messages
      WHERE workspace_id = ?
      GROUP BY session_id
      ORDER BY last_message_at DESC
      LIMIT 20
    `).all(workspace_id || '');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a chat message and get a response
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, agent_id, message, session_id } = req.body;

    if (!workspace_id || !message) {
      return res.status(400).json({ error: 'workspace_id and message are required' });
    }

    const sessionId = session_id || uuidv4();

    // Persist user message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_messages (id, workspace_id, agent_id, role, content, session_id)
      VALUES (?, ?, ?, 'user', ?, ?)
    `).run(userMsgId, workspace_id, agent_id || null, message, sessionId);

    // Fetch agent and provider config
    let agent = null;
    let providerConfig = null;
    if (agent_id) {
      agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
      if (agent?.provider_config_id) {
        providerConfig = db.prepare('SELECT * FROM provider_configs WHERE id = ?').get(agent.provider_config_id);
      }
    }

    // Fetch recent conversation history (last 20 user/assistant messages)
    const history = db.prepare(
      "SELECT role, content FROM chat_messages WHERE session_id = ? AND role IN ('user', 'assistant') ORDER BY created_at ASC LIMIT 20"
    ).all(sessionId);

    let assistantContent = null;
    let responseMetadata = {};

    const apiKey = (providerConfig?.api_key_env_var ? process.env[providerConfig.api_key_env_var] : null)
      || providerConfig?.api_key
      || null;

    if (apiKey && providerConfig?.provider_type === 'openai') {
      const result = await callOpenAI(agent, providerConfig, history, apiKey);
      assistantContent = result.content;
      responseMetadata = { provider: 'openai', model: result.model, usage: result.usage };
    } else if (apiKey && providerConfig?.provider_type === 'anthropic') {
      const result = await callAnthropic(agent, providerConfig, history, apiKey);
      assistantContent = result.content;
      responseMetadata = { provider: 'anthropic', model: result.model, usage: result.usage };
    } else if (apiKey && providerConfig?.provider_type === 'google') {
      const result = await callGoogle(agent, providerConfig, history, apiKey);
      assistantContent = result.content;
      responseMetadata = { provider: 'google', model: result.model, usage: result.usage };
    } else if (apiKey && providerConfig?.provider_type === 'openrouter') {
      const result = await callOpenRouter(agent, providerConfig, history, apiKey);
      assistantContent = result.content;
      responseMetadata = { provider: 'openrouter', model: result.model, usage: result.usage };
    } else if (apiKey && ['groq', 'nvidia', 'kimi', 'minimax', 'glm'].includes(providerConfig?.provider_type)) {
      const result = await callOpenAICompatible(agent, providerConfig, history, apiKey);
      assistantContent = result.content;
      responseMetadata = { provider: providerConfig.provider_type, model: result.model, usage: result.usage };
    } else {
      // Simulated response when no API key is configured
      assistantContent = generateSimulatedResponse(message, agent);
      responseMetadata = { simulated: true };
    }

    // Persist assistant message
    const assistantMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_messages (id, workspace_id, agent_id, role, content, session_id, metadata_json)
      VALUES (?, ?, ?, 'assistant', ?, ?, ?)
    `).run(
      assistantMsgId,
      workspace_id,
      agent_id || null,
      assistantContent,
      sessionId,
      JSON.stringify(responseMetadata)
    );

    res.json({
      session_id: sessionId,
      message_id: assistantMsgId,
      role: 'assistant',
      content: assistantContent,
      metadata: responseMetadata,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function callOpenAI(agent, providerConfig, history, apiKey) {
  const model = providerConfig.model || 'gpt-4o-mini';
  const baseUrl = providerConfig.base_url || 'https://api.openai.com';

  const messages = [];
  if (agent?.system_prompt) {
    messages.push({ role: 'system', content: agent.system_prompt });
  }
  for (const h of history) {
    messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model,
    usage: data.usage,
  };
}

async function callAnthropic(agent, providerConfig, history, apiKey) {
  const model = providerConfig.model || 'claude-3-haiku-20240307';
  const baseUrl = providerConfig.base_url || 'https://api.anthropic.com';

  const systemPrompt = agent?.system_prompt || undefined;
  const messages = history.map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content,
  }));

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    model,
    usage: data.usage,
  };
}

function generateSimulatedResponse(message, agent) {
  const agentName = agent?.name || 'Agent';
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
    return `Hi! I'm ${agentName}. I can help you with coding tasks, answer questions about your project, and execute tasks on your Kanban board. To connect me to a real AI provider, configure a provider (OpenAI, Anthropic, Google, OpenRouter, etc.) and assign it to this agent with an API key environment variable set.`;
  }
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    return `Hello! I'm ${agentName}, ready to assist with your project. How can I help you today?`;
  }
  if (lowerMsg.includes('task') || lowerMsg.includes('card')) {
    return `I can work on tasks from your Kanban board. Navigate to a project board, select a card, and use "Create Run" to assign me to execute it. I'll track progress in the Run queue.`;
  }

  return `I received your message: "${message}". To enable real AI responses, configure an AI provider (OpenAI, Anthropic, Google, OpenRouter, etc.) in the Providers section and assign it to this agent. Currently running in simulation mode.`;
}

async function callGoogle(agent, providerConfig, history, apiKey) {
  const model = providerConfig.model || 'gemini-1.5-flash';
  const baseUrl = providerConfig.base_url || 'https://generativelanguage.googleapis.com';

  // Build Gemini contents
  const contents = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const body = {
    contents,
    generationConfig: { maxOutputTokens: 1024 },
  };
  if (agent?.system_prompt) {
    body.systemInstruction = { parts: [{ text: agent.system_prompt }] };
  }

  const response = await fetch(
    `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Google API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { content: text, model, usage: data.usageMetadata };
}

async function callOpenRouter(agent, providerConfig, history, apiKey) {
  const model = providerConfig.model || 'openai/gpt-4o-mini';
  const baseUrl = providerConfig.base_url || 'https://openrouter.ai';

  const messages = [];
  if (agent?.system_prompt) messages.push({ role: 'system', content: agent.system_prompt });
  for (const h of history) {
    messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }

  const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://foundry.app',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'Foundry',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model,
    usage: data.usage,
  };
}

/**
 * Generic OpenAI-compatible chat completion caller.
 * Used for Groq, NVIDIA NIM, Kimi (Moonshot AI), MiniMax, and GLM/Z.ai.
 */
const OPENAI_COMPAT_BASE_URLS = {
  groq: 'https://api.groq.com/openai',
  nvidia: 'https://integrate.api.nvidia.com',
  kimi: 'https://api.moonshot.cn',
  minimax: 'https://api.minimax.chat',
  glm: 'https://open.bigmodel.cn/api/paas',
};

const OPENAI_COMPAT_DEFAULT_MODELS = {
  groq: 'llama-3.3-70b-versatile',
  nvidia: 'meta/llama-3.1-70b-instruct',
  kimi: 'moonshot-v1-8k',
  minimax: 'MiniMax-Text-01',
  glm: 'glm-4',
};

async function callOpenAICompatible(agent, providerConfig, history, apiKey) {
  const providerType = providerConfig.provider_type;
  const model = providerConfig.model || OPENAI_COMPAT_DEFAULT_MODELS[providerType] || providerType;
  const baseUrl = providerConfig.base_url || OPENAI_COMPAT_BASE_URLS[providerType] || '';

  const messages = [];
  if (agent?.system_prompt) messages.push({ role: 'system', content: agent.system_prompt });
  for (const h of history) {
    messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`${providerType} API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    model,
    usage: data.usage,
  };
}

export default router;

