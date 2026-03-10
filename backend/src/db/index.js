import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || './foundry.db';

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    runMigrations();
    seedDefaultData();
  }
  return db;
}

function initializeSchema() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

/**
 * Runs incremental migrations for existing databases.
 * SQLite does not support ALTER TABLE ... MODIFY COLUMN, so we handle
 * CHECK constraint expansions by recreating the table when needed.
 * Column additions are done with ALTER TABLE ... ADD COLUMN (idempotent via try/catch).
 */
function runMigrations() {
  // Helper: add a column if it doesn't exist yet
  function addColumnIfMissing(table, column, definition) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (_) {
      // Column already exists — no-op
    }
  }

  // runtime_configs: add 'opencode' to CHECK constraint if missing
  const rtTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='runtime_configs'").get();
  if (rtTableInfo?.sql && !rtTableInfo.sql.includes("'opencode'")) {
    db.exec(`
      ALTER TABLE runtime_configs RENAME TO runtime_configs_old;
      CREATE TABLE runtime_configs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        runtime_type TEXT NOT NULL CHECK(runtime_type IN ('codex','claude-code','gemini-cli','kimi-code','kilo-code','opencode')),
        binary_path TEXT,
        extra_args TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO runtime_configs SELECT * FROM runtime_configs_old;
      DROP TABLE runtime_configs_old;
    `);
    console.log('Migration: runtime_configs CHECK constraint updated to include opencode.');
  }

  // provider_configs: add nvidia, groq, kimi to CHECK constraint if missing
  const pcTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='provider_configs'").get();
  if (pcTableInfo?.sql && !pcTableInfo.sql.includes("'nvidia'")) {
    db.exec(`
      ALTER TABLE provider_configs RENAME TO provider_configs_old;
      CREATE TABLE provider_configs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        provider_type TEXT NOT NULL CHECK(provider_type IN ('openai','anthropic','google','openrouter','minimax','glm','nvidia','groq','kimi')),
        base_url TEXT,
        api_key_env_var TEXT,
        api_key TEXT,
        model TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO provider_configs (id, workspace_id, name, provider_type, base_url, api_key_env_var, model, is_default, created_at, updated_at)
        SELECT id, workspace_id, name, provider_type, base_url, api_key_env_var, model, is_default, created_at, updated_at
        FROM provider_configs_old;
      DROP TABLE provider_configs_old;
    `);
    console.log('Migration: provider_configs CHECK constraint updated to include nvidia, groq, kimi.');
  }

  // provider_configs: add api_key column for direct key storage
  addColumnIfMissing('provider_configs', 'api_key', 'TEXT');

  // runs: add token/cost columns
  addColumnIfMissing('runs', 'tokens_input', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('runs', 'tokens_output', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('runs', 'cost_usd', 'REAL NOT NULL DEFAULT 0');

  // agents: add monthly budget
  addColumnIfMissing('agents', 'monthly_budget_usd', 'REAL');

  // teams: add hierarchy and manager
  addColumnIfMissing('teams', 'parent_team_id', 'TEXT REFERENCES teams(id) ON DELETE SET NULL');
  addColumnIfMissing('teams', 'manager_agent_id', 'TEXT REFERENCES agents(id) ON DELETE SET NULL');

  // team_memberships: add title
  addColumnIfMissing('team_memberships', 'title', 'TEXT');

  // chat_messages: add token/cost columns
  addColumnIfMissing('chat_messages', 'tokens_input', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('chat_messages', 'tokens_output', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('chat_messages', 'cost_usd', 'REAL NOT NULL DEFAULT 0');

  // skills and agent_skills are created by schema.sql via CREATE TABLE IF NOT EXISTS
  // mcp_servers is created by schema.sql via CREATE TABLE IF NOT EXISTS
  // users and webhook_configs are created by schema.sql via CREATE TABLE IF NOT EXISTS
  // companies, company_projects, agent_memories are created by schema.sql via CREATE TABLE IF NOT EXISTS
  // (no additional column migrations needed — all new tables use CREATE TABLE IF NOT EXISTS)

  // flows: add canvas_layout_json column for storing node positions
  addColumnIfMissing('flows', 'canvas_layout_json', 'TEXT');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const hashBuf = Buffer.from(hash, 'hex');
    // Support both legacy (no cost params) and new hashes — keylen 64 in both cases
    const candidateBuf = hashBuf.length === 64
      ? scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
      : scryptSync(password, salt, hashBuf.length);
    return timingSafeEqual(hashBuf, candidateBuf);
  } catch {
    return false;
  }
}

function seedDefaultData() {
  const existing = db.prepare('SELECT id FROM workspaces LIMIT 1').get();
  if (existing) {
    // Ensure the admin user is seeded whenever FOUNDRY_ADMIN_PASSWORD is set,
    // even on existing databases that were created before multi-user support.
    seedAdminUser(existing.id);
    return;
  }

  const workspaceId = uuidv4();
  db.prepare(`
    INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)
  `).run(workspaceId, 'Default Workspace', 'default');

  const projectId = uuidv4();
  db.prepare(`
    INSERT INTO projects (id, workspace_id, name, slug, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(projectId, workspaceId, 'Demo Project', 'demo-project', 'A sample project to get started');

  const boardId = uuidv4();
  db.prepare(`
    INSERT INTO boards (id, project_id, name) VALUES (?, ?, ?)
  `).run(boardId, projectId, 'Main Board');

  const columns = [
    { name: 'Todo', position: 0 },
    { name: 'In Progress', position: 1 },
    { name: 'Review', position: 2 },
    { name: 'Done', position: 3 },
  ];

  const columnIds = [];
  for (const col of columns) {
    const colId = uuidv4();
    columnIds.push(colId);
    db.prepare(`
      INSERT INTO board_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)
    `).run(colId, boardId, col.name, col.position);
  }

  const cards = [
    { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', priority: 'high', colIdx: 0 },
    { title: 'Implement authentication', description: 'Add OAuth2 login with GitHub provider', priority: 'high', colIdx: 1 },
    { title: 'Write API documentation', description: 'Document all REST endpoints using OpenAPI spec', priority: 'medium', colIdx: 2 },
    { title: 'Add unit tests', description: 'Achieve 80% test coverage for backend services', priority: 'medium', colIdx: 3 },
  ];

  for (const card of cards) {
    db.prepare(`
      INSERT INTO cards (id, board_id, column_id, project_id, title, description, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), boardId, columnIds[card.colIdx], projectId, card.title, card.description, card.priority, columns[card.colIdx].name.toLowerCase().replace(' ', '_'));
  }

  console.log('Seeded default workspace, project, board, and sample cards.');
  seedAdminUser(workspaceId);
  seedStarterAgents(workspaceId);
}

function seedAdminUser(workspaceId) {
  const adminPassword = process.env.FOUNDRY_ADMIN_PASSWORD;
  if (!adminPassword) return;

  const existing = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (existing) return;

  const passwordHash = hashPassword(adminPassword);
  db.prepare(`
    INSERT INTO users (id, workspace_id, username, password_hash, role, is_active)
    VALUES (?, ?, 'admin', ?, 'admin', 1)
  `).run(uuidv4(), workspaceId, passwordHash);
  console.log('Seeded admin user from FOUNDRY_ADMIN_PASSWORD.');
}

/**
 * Seeds a curated set of starter agents for new workspaces.
 * Inspired by the agency-agents project — provides ready-to-use specialist agents
 * that users can immediately assign to tasks, chat with, and use in flows.
 */
function seedStarterAgents(workspaceId) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM agents WHERE workspace_id = ?').get(workspaceId);
  if (existing.c > 0) return; // Only seed on empty workspace

  const STARTER_AGENTS = [
    {
      name: 'Researcher',
      description: 'Deep research and information synthesis. Finds, evaluates, and summarizes information from multiple sources.',
      system_prompt: `You are an expert research analyst. Your role is to:
- Find and synthesize information from multiple perspectives
- Evaluate source reliability and identify potential biases
- Produce clear, well-structured research reports
- Highlight key findings, trends, and actionable insights
- Always cite your reasoning and flag areas of uncertainty
When asked to research a topic, provide a structured analysis with executive summary, key findings, and recommendations.`,
    },
    {
      name: 'Copywriter',
      description: 'Creates compelling marketing copy, content, and messaging that converts.',
      system_prompt: `You are an expert copywriter and content strategist. Your role is to:
- Write persuasive, engaging copy tailored to the target audience
- Create compelling headlines, CTAs, and value propositions
- Adapt tone and style (professional, casual, technical, etc.) as needed
- Optimize content for clarity and impact
- Follow brand voice guidelines when provided
Always ask about the target audience, goal, and channel before writing copy.`,
    },
    {
      name: 'Code Reviewer',
      description: 'Reviews code for quality, security, performance, and best practices.',
      system_prompt: `You are a senior software engineer specializing in code review. Your role is to:
- Identify bugs, security vulnerabilities, and performance issues
- Suggest improvements for readability and maintainability
- Check for adherence to language/framework best practices
- Point out missing tests and error handling
- Provide specific, actionable feedback with line references
- Explain the reasoning behind each suggestion
Format reviews with: Critical Issues → Improvements → Suggestions → Commendations.`,
    },
    {
      name: 'Tech Lead',
      description: 'Coordinates technical decisions, architecture, and development tasks across the team.',
      system_prompt: `You are an experienced tech lead and software architect. Your role is to:
- Break down complex features into well-defined tasks
- Make and document architectural decisions
- Identify technical risks and propose mitigations
- Balance technical debt vs. delivery speed
- Coordinate work across multiple engineers/agents
- Produce clear technical specifications and ADRs
When planning work, always consider: scalability, maintainability, security, and team velocity.`,
    },
    {
      name: 'DevOps Engineer',
      description: 'Handles CI/CD, infrastructure, deployments, and platform reliability.',
      system_prompt: `You are a senior DevOps/Platform engineer. Your role is to:
- Design and optimize CI/CD pipelines
- Manage infrastructure as code (Terraform, Pulumi, etc.)
- Configure container orchestration (Docker, Kubernetes)
- Monitor system health and set up alerting
- Ensure security hardening and compliance
- Automate repetitive operational tasks
Always follow the principle of "infrastructure as code" and "everything is reproducible".`,
    },
    {
      name: 'QA Engineer',
      description: 'Creates test plans, writes tests, and ensures product quality.',
      system_prompt: `You are a senior QA engineer and test automation specialist. Your role is to:
- Design comprehensive test strategies (unit, integration, E2E, performance)
- Write clear, maintainable test cases with proper assertions
- Identify edge cases, boundary conditions, and failure scenarios
- Create bug reports with reproduction steps and severity classification
- Review requirements for testability
- Suggest quality improvements to the development process
Always consider both happy-path and failure scenarios in your testing.`,
    },
    {
      name: 'Product Manager',
      description: 'Manages product requirements, user stories, and roadmap prioritization.',
      system_prompt: `You are an experienced product manager. Your role is to:
- Translate business goals into clear, actionable user stories
- Write detailed PRDs (Product Requirements Documents)
- Prioritize features using frameworks (RICE, MoSCoW, etc.)
- Define acceptance criteria and success metrics
- Facilitate trade-off decisions between scope, time, and quality
- Create roadmaps aligned with business objectives
Always think from the user's perspective and tie features to measurable outcomes.`,
    },
    {
      name: 'UI/UX Designer',
      description: 'Designs user interfaces and experiences with accessibility and usability in mind.',
      system_prompt: `You are a senior UI/UX designer. Your role is to:
- Create user-centered design specifications and wireframes (in text/markdown)
- Define component structures, layouts, and interaction patterns
- Ensure accessibility (WCAG 2.1 AA compliance)
- Design consistent visual hierarchies and information architecture
- Provide design tokens (colors, typography, spacing) as needed
- Review implementations for design fidelity
Describe designs in precise, developer-friendly language with specific measurements and states.`,
    },
  ];

  const insert = db.prepare(`
    INSERT INTO agents (id, workspace_id, name, description, execution_mode, system_prompt)
    VALUES (?, ?, ?, ?, 'provider', ?)
  `);

  const insertAll = db.transaction((agents) => {
    for (const agent of agents) {
      insert.run(uuidv4(), workspaceId, agent.name, agent.description, agent.system_prompt);
    }
  });

  insertAll(STARTER_AGENTS);
  console.log(`Seeded ${STARTER_AGENTS.length} starter agents.`);
}

export default getDb;
