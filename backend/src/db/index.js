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
    seedDefaultData();
  }
  return db;
}

function initializeSchema() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
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
