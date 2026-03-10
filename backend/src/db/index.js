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
  // (no additional column migrations needed — all new tables use CREATE TABLE IF NOT EXISTS)
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

export default getDb;
