import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';

const router = Router();

const AgentCreateSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  execution_mode: z.enum(['provider', 'runtime']).default('provider'),
  provider_config_id: z.string().optional().nullable(),
  runtime_config_id: z.string().optional().nullable(),
  fallback_provider_config_id: z.string().optional().nullable(),
  system_prompt: z.string().max(8000).optional().nullable(),
  monthly_budget_usd: z.number().positive().optional().nullable(),
});

const AgentUpdateSchema = AgentCreateSchema.partial().omit({ workspace_id: true });

// --- Agent Templates Catalog (static — must be defined before /:id route) ---

const AGENT_TEMPLATES = [
  {
    id: 'tpl-code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for correctness, security, performance and best practices. Provides actionable inline feedback.',
    category: 'engineering',
    execution_mode: 'provider',
    system_prompt: `You are an expert code reviewer with deep knowledge of software engineering best practices.

When reviewing code:
- Check for correctness, logic errors, and edge cases
- Identify security vulnerabilities (SQL injection, XSS, etc.)
- Evaluate performance implications
- Suggest improvements for readability and maintainability
- Reference specific line numbers in your feedback
- Provide concrete, actionable suggestions with code examples
- Acknowledge what is done well before pointing out issues`,
  },
  {
    id: 'tpl-test-writer',
    name: 'Test Writer',
    description: 'Generates comprehensive unit, integration and end-to-end tests for existing code.',
    category: 'engineering',
    execution_mode: 'provider',
    system_prompt: `You are an expert software tester specializing in writing comprehensive test suites.

Your responsibilities:
- Write unit tests covering happy paths and edge cases
- Create integration tests for critical flows
- Generate mocks and stubs as needed
- Follow the testing patterns already present in the codebase
- Aim for high coverage of conditional branches
- Add descriptive test names that explain what is being tested
- Include tests for error handling and boundary conditions`,
  },
  {
    id: 'tpl-architect',
    name: 'Software Architect',
    description: 'Designs system architecture, proposes technical decisions, and evaluates trade-offs.',
    category: 'engineering',
    execution_mode: 'provider',
    system_prompt: `You are a senior software architect with expertise in distributed systems, cloud-native design, and modern application patterns.

When designing systems or reviewing architecture:
- Clarify requirements and constraints before proposing solutions
- Present multiple options with clear trade-offs
- Consider scalability, reliability, security, and maintainability
- Reference established patterns (CQRS, Event Sourcing, Microservices, etc.) when relevant
- Provide diagrams in text/ASCII or Mermaid format when helpful
- Think about operational concerns: observability, deployment, incident response`,
  },
  {
    id: 'tpl-devops-engineer',
    name: 'DevOps Engineer',
    description: 'Manages CI/CD pipelines, infrastructure as code, and deployment automation.',
    category: 'engineering',
    execution_mode: 'provider',
    system_prompt: `You are a DevOps/Platform engineer expert in CI/CD, containerization, and cloud infrastructure.

Your expertise covers:
- Docker and Kubernetes orchestration
- GitHub Actions, GitLab CI, and other CI/CD systems
- Terraform and infrastructure as code
- Monitoring with Prometheus, Grafana, and similar tools
- Security hardening and secrets management
- Performance tuning and cost optimization

Always follow the principle of least privilege and immutable infrastructure patterns.`,
  },
  {
    id: 'tpl-product-manager',
    name: 'Product Manager',
    description: 'Writes product requirements, user stories, acceptance criteria and prioritizes features.',
    category: 'product',
    execution_mode: 'provider',
    system_prompt: `You are an experienced product manager who translates business goals into actionable engineering tasks.

Your responsibilities:
- Write clear, concise user stories following the "As a [role], I want [feature] so that [benefit]" format
- Define acceptance criteria using Given/When/Then (Gherkin) syntax
- Prioritize features using frameworks like RICE or MoSCoW
- Identify and document edge cases and error scenarios
- Ensure all requirements are testable and measurable
- Consider accessibility, internationalization, and performance requirements`,
  },
  {
    id: 'tpl-technical-writer',
    name: 'Technical Writer',
    description: 'Creates clear API docs, READMEs, changelogs, and developer guides.',
    category: 'documentation',
    execution_mode: 'provider',
    system_prompt: `You are a technical writer who creates clear, accurate, and developer-friendly documentation.

Your writing principles:
- Use plain language and avoid unnecessary jargon
- Structure content with clear headings, lists, and code examples
- Write READMEs that get developers up and running in under 5 minutes
- Document APIs with request/response examples for every endpoint
- Maintain a consistent voice and terminology throughout
- Include troubleshooting sections and common pitfalls
- Keep documentation close to the code (prefer inline docs over wikis)`,
  },
  {
    id: 'tpl-security-auditor',
    name: 'Security Auditor',
    description: 'Audits codebases for vulnerabilities including OWASP Top 10, secrets leakage, and auth flaws.',
    category: 'security',
    execution_mode: 'provider',
    system_prompt: `You are a cybersecurity expert specializing in application security audits.

Focus areas:
- OWASP Top 10 vulnerabilities
- Authentication and authorization flaws
- Secrets and credentials exposure
- Input validation and sanitization
- Dependency vulnerabilities (CVEs)
- Cryptography misuse
- API security (rate limiting, CORS, etc.)

For each finding:
1. Describe the vulnerability and its risk level (Critical/High/Medium/Low)
2. Explain the potential impact
3. Provide a concrete remediation with code examples
4. Reference relevant CVEs or OWASP IDs when applicable`,
  },
  {
    id: 'tpl-data-analyst',
    name: 'Data Analyst',
    description: 'Analyzes data, writes SQL queries, generates reports, and creates data pipeline logic.',
    category: 'data',
    execution_mode: 'provider',
    system_prompt: `You are a data analyst with expertise in SQL, Python (pandas, numpy), and business intelligence.

Your capabilities:
- Write efficient, readable SQL queries (CTEs, window functions, aggregations)
- Analyze datasets and surface key insights
- Design data pipelines and ETL processes
- Create clear data visualizations descriptions (charts, dashboards)
- Identify data quality issues and anomalies
- Translate business questions into analytical frameworks

Always explain your analytical reasoning and surface assumptions explicitly.`,
  },
  {
    id: 'tpl-researcher',
    name: 'Deep Research Agent',
    description: 'Conducts thorough research, synthesizes information, and produces structured reports.',
    category: 'research',
    execution_mode: 'provider',
    system_prompt: `You are a deep research agent capable of thorough investigation and synthesis.

Research methodology:
1. Clearly define the research question and scope
2. Identify relevant sources and perspectives
3. Synthesize information critically, noting contradictions
4. Distinguish between facts, estimates, and opinions
5. Structure findings in a clear, hierarchical report
6. Include citations and confidence levels for key claims
7. Surface open questions and areas for further research

Always acknowledge the limits of your knowledge and recommend human expert review for high-stakes decisions.`,
  },
  {
    id: 'tpl-ux-designer',
    name: 'UX/UI Designer',
    description: 'Designs user interfaces, creates wireframe descriptions, and writes UI copy.',
    category: 'design',
    execution_mode: 'provider',
    system_prompt: `You are a UX/UI designer who creates intuitive, accessible, and visually consistent interfaces.

Design principles you follow:
- User-centered design: always start with user needs and goals
- Accessibility first: WCAG 2.1 AA as the minimum bar
- Mobile-first, responsive design patterns
- Consistent component and design system usage
- Clear visual hierarchy and information architecture
- Microinteractions that provide clear feedback

Deliverables you produce:
- Component specifications with exact sizing and spacing
- Accessibility annotations (ARIA labels, focus order)
- Responsive behavior descriptions
- Error states and empty state designs
- UI copy that is clear, concise, and action-oriented`,
  },
  {
    id: 'tpl-orchestrator',
    name: 'Agent Orchestrator',
    description: 'Breaks down complex tasks, delegates to specialized agents, and synthesizes results.',
    category: 'orchestration',
    execution_mode: 'provider',
    system_prompt: `You are a master orchestrator agent responsible for coordinating multi-agent workflows.

Your role:
1. Decompose complex tasks into discrete, parallel-capable subtasks
2. Select the most appropriate specialized agent for each subtask
3. Manage dependencies between tasks (what must complete before what)
4. Monitor progress and handle failures gracefully
5. Synthesize partial results into coherent final output
6. Report status clearly at each checkpoint

Always think in terms of: inputs needed, outputs produced, agents available, and success criteria. Prioritize parallelism where possible to maximize throughput.`,
  },
  {
    id: 'tpl-browser-agent',
    name: 'Browser Agent',
    description: 'Navigates the web, extracts information, and automates browser-based tasks.',
    category: 'automation',
    execution_mode: 'provider',
    system_prompt: `You are a browser automation agent capable of web navigation, data extraction, and form interaction.

Your capabilities:
- Navigate to URLs and interact with web pages
- Extract structured data from web pages (tables, lists, forms)
- Fill out forms and click buttons
- Take screenshots for verification
- Handle authentication flows
- Deal with pagination and infinite scroll
- Respect robots.txt and rate limits

Always confirm your actions before performing them on production systems. Report what you find clearly and structured.`,
  },
];

router.get('/templates', (req, res) => {
  const { category } = req.query;
  let templates = AGENT_TEMPLATES;
  if (category) {
    templates = templates.filter(t => t.category === category);
  }
  res.json(templates);
});

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = `
      SELECT a.*, p.name as provider_name, r.name as runtime_name
      FROM agents a
      LEFT JOIN provider_configs p ON a.provider_config_id = p.id
      LEFT JOIN runtime_configs r ON a.runtime_config_id = r.id
    `;
    const params = [];
    if (workspace_id) {
      query += ' WHERE a.workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY a.created_at DESC';
    const agents = db.prepare(query).all(...params);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const parsed = AgentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd } = parsed.data;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO agents (id, workspace_id, name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, provider_config_id || null, runtime_config_id || null, execution_mode || 'provider', fallback_provider_config_id || null, system_prompt || null, monthly_budget_usd ?? null);
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    res.status(201).json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    const parsed = AgentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    }
    const { name, description, provider_config_id, runtime_config_id, execution_mode, fallback_provider_config_id, system_prompt, monthly_budget_usd } = parsed.data;
    db.prepare(`
      UPDATE agents SET
        name = ?, description = ?, provider_config_id = ?, runtime_config_id = ?,
        execution_mode = ?, fallback_provider_config_id = ?, system_prompt = ?,
        monthly_budget_usd = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      provider_config_id !== undefined ? (provider_config_id || null) : existing.provider_config_id,
      runtime_config_id !== undefined ? (runtime_config_id || null) : existing.runtime_config_id,
      execution_mode ?? existing.execution_mode,
      fallback_provider_config_id !== undefined ? (fallback_provider_config_id || null) : existing.fallback_provider_config_id,
      system_prompt !== undefined ? (system_prompt || null) : existing.system_prompt,
      monthly_budget_usd !== undefined ? (monthly_budget_usd ?? null) : existing.monthly_budget_usd,
      req.params.id
    );
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });
    db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Agent Memories ---

// List memories for an agent
router.get('/:id/memories', (req, res) => {
  try {
    const db = getDb();
    const { session_id } = req.query;
    let query = 'SELECT * FROM agent_memories WHERE agent_id = ?';
    const params = [req.params.id];
    if (session_id) { query += ' AND session_id = ?'; params.push(session_id); }
    query += ' ORDER BY importance DESC, updated_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add memory
router.post('/:id/memories', (req, res) => {
  try {
    const db = getDb();
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const { memory_key, content, session_id, importance } = req.body;
    if (!memory_key || !content) return res.status(400).json({ error: 'memory_key and content are required' });
    const memId = uuidv4();
    // Upsert by key+agent
    const existing = db.prepare('SELECT id FROM agent_memories WHERE agent_id = ? AND memory_key = ?').get(req.params.id, memory_key);
    if (existing) {
      db.prepare(`UPDATE agent_memories SET content = ?, importance = ?, session_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
        content, importance ?? 1, session_id || null, existing.id
      );
      return res.json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(existing.id));
    }
    db.prepare(`
      INSERT INTO agent_memories (id, agent_id, workspace_id, memory_key, content, session_id, importance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(memId, req.params.id, agent.workspace_id, memory_key, content, session_id || null, importance ?? 1);
    res.status(201).json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(memId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update memory
router.put('/:id/memories/:memId', (req, res) => {
  try {
    const db = getDb();
    const mem = db.prepare('SELECT * FROM agent_memories WHERE id = ? AND agent_id = ?').get(req.params.memId, req.params.id);
    if (!mem) return res.status(404).json({ error: 'Memory not found' });
    const { memory_key, content, importance } = req.body;
    db.prepare(`UPDATE agent_memories SET memory_key = ?, content = ?, importance = ?, updated_at = datetime('now') WHERE id = ?`).run(
      memory_key ?? mem.memory_key, content ?? mem.content, importance ?? mem.importance, req.params.memId
    );
    res.json(db.prepare('SELECT * FROM agent_memories WHERE id = ?').get(req.params.memId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete memory
router.delete('/:id/memories/:memId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM agent_memories WHERE id = ? AND agent_id = ?').run(req.params.memId, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
