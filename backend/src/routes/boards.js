import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';

const router = Router();

// Boards CRUD
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { project_id } = req.query;
    let query = 'SELECT * FROM boards';
    const params = [];
    if (project_id) {
      query += ' WHERE project_id = ?';
      params.push(project_id);
    }
    query += ' ORDER BY created_at DESC';
    const boards = db.prepare(query).all(...params);
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const columns = db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC').all(req.params.id);
    res.json({ ...board, columns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { project_id, name } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: 'project_id and name are required' });
    const id = uuidv4();
    db.prepare('INSERT INTO boards (id, project_id, name) VALUES (?, ?, ?)').run(id, project_id, name);

    // Create default columns
    const defaultCols = ['Todo', 'In Progress', 'Review', 'Done'];
    for (let i = 0; i < defaultCols.length; i++) {
      db.prepare('INSERT INTO board_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)').run(uuidv4(), id, defaultCols[i], i);
    }

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
    const columns = db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC').all(id);
    res.status(201).json({ ...board, columns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Board not found' });
    const { name } = req.body;
    db.prepare(`UPDATE boards SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(name ?? existing.name, req.params.id);
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Board not found' });
    db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Column routes
router.get('/:boardId/columns', (req, res) => {
  try {
    const db = getDb();
    const columns = db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC').all(req.params.boardId);
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:boardId/columns', (req, res) => {
  try {
    const db = getDb();
    const { name, position } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const maxPos = db.prepare('SELECT MAX(position) as mp FROM board_columns WHERE board_id = ?').get(req.params.boardId);
    const pos = position ?? ((maxPos?.mp ?? -1) + 1);
    const id = uuidv4();
    db.prepare('INSERT INTO board_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)').run(id, req.params.boardId, name, pos);
    const col = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
    res.status(201).json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:boardId/columns/:colId', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM board_columns WHERE id = ? AND board_id = ?').get(req.params.colId, req.params.boardId);
    if (!existing) return res.status(404).json({ error: 'Column not found' });
    const { name, position } = req.body;
    db.prepare(`UPDATE board_columns SET name = ?, position = ?, updated_at = datetime('now') WHERE id = ?`).run(
      name ?? existing.name, position ?? existing.position, req.params.colId
    );
    const col = db.prepare('SELECT * FROM board_columns WHERE id = ?').get(req.params.colId);
    res.json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:boardId/columns/:colId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM board_columns WHERE id = ? AND board_id = ?').run(req.params.colId, req.params.boardId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
