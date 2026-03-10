import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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
 */
function runMigrations() {
  // Check if the runtime_configs table has the old CHECK constraint (missing 'opencode')
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='runtime_configs'").get();
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'opencode'")) {
    // Recreate the runtime_configs table with the updated CHECK constraint
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

  // Add new tables for flows, flow_steps, flow_runs, chat_messages if not present
  // (These are created by schema.sql via CREATE TABLE IF NOT EXISTS, so no extra migration needed)
}

function seedDefaultData() {
  const existing = db.prepare('SELECT id FROM workspaces LIMIT 1').get();
  if (existing) return;

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
}

export default getDb;
