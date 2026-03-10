import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db/index.js';

const router = Router();

const CompanySchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  company_size: z.string().max(50).optional().nullable(),
  contact_name: z.string().max(200).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const CompanyUpdateSchema = CompanySchema.partial().omit({ workspace_id: true });

// List companies
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { workspace_id, search } = req.query;
    let query = 'SELECT * FROM companies';
    const params = [];
    const conditions = [];
    if (workspace_id) { conditions.push('workspace_id = ?'); params.push(workspace_id); }
    if (search) { conditions.push('(name LIKE ? OR industry LIKE ? OR contact_name LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name ASC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single company with associated projects
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN company_projects cp ON cp.project_id = p.id
      WHERE cp.company_id = ?
    `).all(req.params.id);
    res.json({ ...company, projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create company
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const parsed = CompanySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    const { workspace_id, name, description, website, industry, company_size, contact_name, contact_email, notes } = parsed.data;
    const id = uuidv4();
    db.prepare(`
      INSERT INTO companies (id, workspace_id, name, description, website, industry, company_size, contact_name, contact_email, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, description || null, website || null, industry || null, company_size || null, contact_name || null, contact_email || null, notes || null);
    res.status(201).json(db.prepare('SELECT * FROM companies WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update company
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Company not found' });
    const parsed = CompanyUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors.map(e => e.message).join('; ') });
    const d = parsed.data;
    db.prepare(`
      UPDATE companies SET
        name = ?, description = ?, website = ?, industry = ?, company_size = ?,
        contact_name = ?, contact_email = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      d.name ?? existing.name, d.description ?? existing.description,
      d.website ?? existing.website, d.industry ?? existing.industry,
      d.company_size ?? existing.company_size, d.contact_name ?? existing.contact_name,
      d.contact_email ?? existing.contact_email, d.notes ?? existing.notes,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete company
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    if (!db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Company not found' });
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Associate project with company
router.post('/:id/projects', (req, res) => {
  try {
    const db = getDb();
    const { project_id } = req.body;
    if (!project_id) return res.status(400).json({ error: 'project_id is required' });
    const existing = db.prepare('SELECT id FROM company_projects WHERE company_id = ? AND project_id = ?').get(req.params.id, project_id);
    if (existing) return res.status(409).json({ error: 'Already associated' });
    db.prepare('INSERT INTO company_projects (id, company_id, project_id) VALUES (?, ?, ?)').run(uuidv4(), req.params.id, project_id);
    res.status(201).json({ company_id: req.params.id, project_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove project from company
router.delete('/:id/projects/:projectId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM company_projects WHERE company_id = ? AND project_id = ?').run(req.params.id, req.params.projectId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
