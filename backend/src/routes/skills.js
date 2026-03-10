import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// --- Skills Catalog: curated pre-built skills users can install ---
// (defined before /:id route to avoid route conflicts)

const SKILLS_CATALOG = [
  // ── System-prompt skills ──────────────────────────────────────────────────
  {
    id: 'cat-code-review-prompt',
    name: 'Code Review Expert',
    description: 'Turns any agent into a thorough code reviewer that checks correctness, security and performance.',
    skill_type: 'system_prompt',
    category: 'engineering',
    content: `You are an expert code reviewer. When reviewing code:
- Focus on correctness, performance, and security
- Provide specific, actionable feedback with line references
- Suggest tests for edge cases
- Acknowledge what is done well`,
  },
  {
    id: 'cat-ui-ux-skill',
    name: 'UI/UX Pro',
    description: 'Expert UI/UX design skills: accessibility, responsive design, design system compliance.',
    skill_type: 'system_prompt',
    category: 'design',
    content: `You are a UI/UX design expert. Apply these principles to all work:
- Mobile-first, responsive design
- WCAG 2.1 AA accessibility compliance
- Consistent component usage from the design system
- Clear visual hierarchy and user-centered flows
- Write micro-copy that is clear and action-oriented`,
  },
  {
    id: 'cat-research-skill',
    name: 'Deep Research',
    description: 'Enables structured, multi-step research with synthesis and citation tracking.',
    skill_type: 'system_prompt',
    category: 'research',
    content: `You are a deep research specialist. For every research task:
1. Define scope and key questions
2. Identify primary and secondary sources
3. Cross-reference claims across sources
4. Distinguish facts from estimates and opinions
5. Produce a structured report with executive summary
6. Cite sources and note confidence levels`,
  },
  {
    id: 'cat-security-audit-skill',
    name: 'Security Auditor',
    description: 'Focuses agents on OWASP Top 10, secrets exposure, auth flaws and dependency CVEs.',
    skill_type: 'system_prompt',
    category: 'security',
    content: `You are a security auditor. For every codebase you review:
- Check OWASP Top 10 vulnerabilities
- Identify secrets or credentials in code
- Review authentication and authorization logic
- Evaluate dependency security (CVEs)
- Provide risk ratings (Critical / High / Medium / Low) per finding
- Give concrete remediation steps with code examples`,
  },
  {
    id: 'cat-plan-mode-skill',
    name: 'Plan-Before-Act',
    description: 'Instructs agents to always produce a numbered plan before executing, improving accuracy on complex tasks.',
    skill_type: 'system_prompt',
    category: 'productivity',
    content: `Before taking any action or producing output, always:
1. Restate the task in your own words to confirm understanding
2. Identify any ambiguities and state your assumptions
3. Write a numbered plan of steps you will follow
4. Then execute the plan step by step
5. After completing, summarise what was done and flag any open items

Only begin implementation after the plan is approved (or explicitly told to proceed).`,
  },
  {
    id: 'cat-last30days-skill',
    name: 'Last 30 Days Research',
    description: 'Skill for researching recent news and developments within the last 30 days.',
    skill_type: 'system_prompt',
    category: 'research',
    content: `When researching topics, focus on developments from the last 30 days:
- Prioritise recency in all findings
- Note publication dates for every source
- Highlight what has changed compared to prior understanding
- Flag time-sensitive information with an expiry warning
- Structure findings: Breaking / Trending / Context`,
  },
  {
    id: 'cat-gsd-skill',
    name: 'Get Shit Done (GSD)',
    description: 'Practical productivity methodology: prioritise ruthlessly, ship iteratively, unblock fast.',
    skill_type: 'system_prompt',
    category: 'productivity',
    content: `Apply the GSD (Get Shit Done) methodology:
- Ruthlessly prioritise: focus only on what moves the needle today
- Default to action: done > perfect, ship then iterate
- Remove blockers immediately: identify and escalate anything blocking progress
- Communicate status in three words or fewer when possible
- End every session with: \u2705 Done / \ud83d\udd04 In Progress / \u274c Blocked`,
  },
  {
    id: 'cat-aidd-skill',
    name: 'AIDD (AI-Driven Development)',
    description: 'AI-Driven Development methodology: spec → generate → review → integrate.',
    skill_type: 'system_prompt',
    category: 'engineering',
    content: `Follow the AIDD (AI-Driven Development) methodology:
1. SPEC: Start with a clear, unambiguous specification
2. GENERATE: Produce code / content that exactly satisfies the spec
3. REVIEW: Self-review output against the spec before presenting it
4. INTEGRATE: Note integration points and potential conflicts
5. ITERATE: Accept feedback and refine in tight loops

Always keep the spec and the implementation in sync.`,
  },
  {
    id: 'cat-superpowers-skill',
    name: 'Dev Superpowers',
    description: 'Advanced workflow framework giving agents enhanced project management and engineering capabilities.',
    skill_type: 'system_prompt',
    category: 'engineering',
    content: `You have access to enhanced development superpowers:
- Codebase archaeology: trace any decision back to its origin
- Refactor radar: identify high-leverage refactoring opportunities
- Dependency graph analysis: map module relationships
- Performance profiling mindset: always ask "what is the hot path?"
- Test coverage intuition: know which code paths are most risky
- Documentation generation: produce docs as a byproduct of work

Apply these capabilities proactively without being asked.`,
  },
  // ── Tool skills ────────────────────────────────────────────────────────────
  {
    id: 'cat-terminal-tool',
    name: 'Terminal Tool',
    description: 'Gives agents the ability to run shell commands in a sandboxed environment.',
    skill_type: 'tool',
    category: 'tools',
    content: JSON.stringify({
      name: 'run_command',
      description: 'Run a shell command and return stdout/stderr',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          timeout_ms: { type: 'number', description: 'Timeout in milliseconds', default: 30000 },
        },
        required: ['command'],
      },
    }, null, 2),
  },
  {
    id: 'cat-browser-tool',
    name: 'Browser Tool',
    description: 'Allows agents to navigate URLs, click elements, and extract page content.',
    skill_type: 'tool',
    category: 'tools',
    content: JSON.stringify({
      name: 'browse_web',
      description: 'Navigate to a URL and return page content or perform an action',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' },
          action: { type: 'string', enum: ['read', 'screenshot', 'click', 'fill'], description: 'Action to perform' },
          selector: { type: 'string', description: 'CSS selector for click/fill actions' },
          value: { type: 'string', description: 'Value for fill action' },
        },
        required: ['url', 'action'],
      },
    }, null, 2),
  },
  {
    id: 'cat-file-tool',
    name: 'File System Tool',
    description: 'Lets agents read, write, list and search files in the project directory.',
    skill_type: 'tool',
    category: 'tools',
    content: JSON.stringify({
      name: 'file_operation',
      description: 'Perform file system operations',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['read', 'write', 'list', 'search', 'delete'] },
          path: { type: 'string', description: 'File or directory path' },
          content: { type: 'string', description: 'Content to write (for write operation)' },
          pattern: { type: 'string', description: 'Search pattern (for search operation)' },
        },
        required: ['operation', 'path'],
      },
    }, null, 2),
  },
  // ── MCP skills ─────────────────────────────────────────────────────────────
  {
    id: 'cat-github-mcp',
    name: 'GitHub MCP',
    description: 'Connect agents to GitHub for repo management, issues, PRs and code search.',
    skill_type: 'mcp',
    category: 'integrations',
    content: JSON.stringify({
      server: 'github',
      capabilities: ['list_repos', 'create_issue', 'create_pr', 'search_code', 'get_file', 'push_file'],
    }, null, 2),
  },
  {
    id: 'cat-google-workspace-mcp',
    name: 'Google Workspace MCP',
    description: 'Connects agents to Google Drive, Docs, Sheets, Calendar and Gmail.',
    skill_type: 'mcp',
    category: 'integrations',
    content: JSON.stringify({
      server: 'google_workspace',
      capabilities: ['drive_list', 'docs_read', 'docs_write', 'sheets_read', 'sheets_write', 'calendar_events', 'gmail_read'],
    }, null, 2),
  },
  {
    id: 'cat-browser-use-mcp',
    name: 'Browser Use MCP',
    description: 'Integrates the browser-use framework for natural-language browser automation.',
    skill_type: 'mcp',
    category: 'tools',
    content: JSON.stringify({
      server: 'browser-use',
      transport: 'stdio',
      command: 'uvx',
      args: ['browser-use-mcp'],
      capabilities: ['navigate', 'click', 'type', 'extract', 'screenshot', 'scroll'],
    }, null, 2),
  },
];

router.get('/catalog', (req, res) => {
  const { category, skill_type } = req.query;
  let items = SKILLS_CATALOG;
  if (category) items = items.filter(s => s.category === category);
  if (skill_type) items = items.filter(s => s.skill_type === skill_type);
  res.json(items);
});

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id } = req.query;
    let query = 'SELECT * FROM skills';
    const params = [];
    if (workspace_id) {
      query += ' WHERE workspace_id = ?';
      params.push(workspace_id);
    }
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    // Include agents using this skill
    const agents = db.prepare(`
      SELECT a.id, a.name, a.execution_mode FROM agent_skills asl
      JOIN agents a ON asl.agent_id = a.id
      WHERE asl.skill_id = ?
    `).all(req.params.id);
    res.json({ ...skill, agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, name, description, skill_type, content, is_public } = req.body;
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id and name are required' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO skills (id, workspace_id, name, description, skill_type, content, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, skill_type || 'system_prompt', content || null, is_public ? 1 : 0);
    res.status(201).json(db.prepare('SELECT * FROM skills WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    const { name, description, skill_type, content, is_public } = req.body;
    db.prepare(`
      UPDATE skills SET name = ?, description = ?, skill_type = ?, content = ?, is_public = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? skill.name,
      description ?? skill.description,
      skill_type ?? skill.skill_type,
      content ?? skill.content,
      is_public !== undefined ? (is_public ? 1 : 0) : skill.is_public,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign skill to agent
router.post('/:id/agents', (req, res) => {
  try {
    const db = getDb();
    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id is required' });
    db.prepare('INSERT OR IGNORE INTO agent_skills (id, agent_id, skill_id) VALUES (?, ?, ?)').run(uuidv4(), agent_id, req.params.id);
    res.status(201).json({ skill_id: req.params.id, agent_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove skill from agent
router.delete('/:id/agents/:agentId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM agent_skills WHERE skill_id = ? AND agent_id = ?').run(req.params.id, req.params.agentId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
