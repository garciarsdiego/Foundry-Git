import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Github, Loader, Pencil, Trash2, Search } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function ProjectForm({ initial = {}, onSubmit, onCancel, workspaceId }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    repo_url: initial.repo_url || '',
    repo_owner: initial.repo_owner || '',
    repo_name: initial.repo_name || '',
    default_branch: initial.default_branch || 'main',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, workspace_id: workspaceId, slug: slugify(form.name) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Project Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="My Project" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2} placeholder="What does this project do?" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <div className="border-t border-[#2a2d35] pt-4">
        <p className="text-sm text-gray-500 mb-3">GitHub Repository (optional)</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Repo URL</label>
            <input value={form.repo_url} onChange={set('repo_url')} placeholder="https://github.com/owner/repo" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Owner</label>
              <input value={form.repo_owner} onChange={set('repo_owner')} placeholder="octocat" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Repo Name</label>
              <input value={form.repo_name} onChange={set('repo_name')} placeholder="my-repo" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Branch</label>
            <input value={form.default_branch} onChange={set('default_branch')} placeholder="main" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const workspaceId = 'default';

  async function load() {
    try {
      const [ws, projs] = await Promise.all([api.get('/workspaces'), api.get('/projects')]);
      setProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
    const ws = await api.get('/workspaces');
    const wsId = ws[0]?.id;
    if (!wsId) throw new Error('No workspace found');
    await api.post('/projects', { ...data, workspace_id: wsId });
    setModalOpen(false);
    load();
  }

  async function handleEdit(data) {
    await api.put(`/projects/${editing.id}`, data);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    setConfirmDelete(id);
  }

  async function confirmDeleteProject() {
    await api.delete(`/projects/${confirmDelete}`);
    load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">Manage your AI-powered development projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-9 pr-3 py-2 bg-[#16181c] border border-[#2a2d35] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FolderKanban size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No projects yet</p>
          <p className="text-sm mb-4">Create your first project to get started</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase())).map(p => (
            <div key={p.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <FolderKanban size={16} className="text-blue-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(p)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <Link to={`/projects/${p.id}`}>
                <h3 className="font-semibold text-white hover:text-blue-300 transition-colors mb-1">{p.name}</h3>
              </Link>
              {p.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
              {(p.repo_owner && p.repo_name) ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Github size={11} />
                  <span>{p.repo_owner}/{p.repo_name}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-600">No repo linked</div>
              )}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2a2d35]">
                <Link to={`/projects/${p.id}/board`} className="flex-1 text-center text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">Board</Link>
                <Link to={`/projects/${p.id}`} className="flex-1 text-center text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">Details</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Project" size="lg">
        <ProjectForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Project" size="lg">
        {editing && <ProjectForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? All boards, cards, and runs will be permanently removed."
        confirmLabel="Delete Project"
      />
    </div>
  );
}
