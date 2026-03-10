import React, { useState, useEffect } from 'react';
import { Plus, Building2, Loader, Pencil, Trash2, Search, Globe, Mail, Users, ExternalLink, X, FolderKanban } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing',
  'Media & Entertainment', 'Real Estate', 'Consulting', 'Government', 'Non-Profit', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1001+'];

function CompanyForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    website: initial.website || '',
    industry: initial.industry || '',
    company_size: initial.company_size || '',
    contact_name: initial.contact_name || '',
    contact_email: initial.contact_email || '',
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
          <input value={form.name} onChange={set('name')} autoFocus placeholder="Acme Corp" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Brief description of the company…" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Website</label>
          <input value={form.website} onChange={set('website')} placeholder="https://example.com" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Industry</label>
          <select value={form.industry} onChange={set('industry')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Company Size</label>
          <select value={form.company_size} onChange={set('company_size')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select size…</option>
            {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
          <input value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Smith" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
          <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="contact@example.com" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Internal notes, context, requirements…" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : initial.id ? 'Update Company' : 'Create Company'}
        </button>
      </div>
    </form>
  );
}

function CompanyDetailDrawer({ company, projects, allProjects, onClose, onEdit, onDelete, onLinkProject, onUnlinkProject }) {
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linking, setLinking] = useState(false);

  const linkedIds = new Set((company.projects || []).map(p => p.id));
  const unlinked = allProjects.filter(p => !linkedIds.has(p.id));

  async function handleLink() {
    if (!linkProjectId) return;
    setLinking(true);
    try {
      await onLinkProject(company.id, linkProjectId);
      setLinkProjectId('');
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-96 bg-[#16181c] border-l border-[#2a2d35] flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d35]">
          <h2 className="font-semibold text-white truncate">{company.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(company)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg"><Pencil size={14} /></button>
            <button onClick={() => onDelete(company.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg"><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 p-5 space-y-5">
          {company.description && <p className="text-sm text-gray-400">{company.description}</p>}

          <div className="space-y-2">
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                <Globe size={13} /> {company.website}
              </a>
            )}
            {company.contact_email && (
              <a href={`mailto:${company.contact_email}`} className="flex items-center gap-2 text-sm text-gray-300">
                <Mail size={13} /> {company.contact_email}
              </a>
            )}
            {company.contact_name && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users size={13} /> {company.contact_name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {company.industry && (
              <div className="bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500 mb-0.5">Industry</div>
                <div className="text-sm text-white">{company.industry}</div>
              </div>
            )}
            {company.company_size && (
              <div className="bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500 mb-0.5">Size</div>
                <div className="text-sm text-white">{company.company_size} employees</div>
              </div>
            )}
          </div>

          {company.notes && (
            <div className="bg-[#0d0d0f] border border-[#2a2d35] rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1.5">Notes</div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{company.notes}</p>
            </div>
          )}

          {/* Associated projects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5"><FolderKanban size={14} /> Projects ({(company.projects || []).length})</h3>
            </div>
            {(company.projects || []).length === 0 ? (
              <p className="text-xs text-gray-600 py-2">No projects linked yet</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {(company.projects || []).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2">
                    <span className="text-sm text-white">{p.name}</span>
                    <button onClick={() => onUnlinkProject(company.id, p.id)} className="text-gray-600 hover:text-red-400 transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {unlinked.length > 0 && (
              <div className="flex gap-2">
                <select value={linkProjectId} onChange={e => setLinkProjectId(e.target.value)} className="flex-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500">
                  <option value="">Link a project…</option>
                  {unlinked.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={handleLink} disabled={!linkProjectId || linking} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs disabled:opacity-50">
                  {linking ? '…' : 'Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const INDUSTRY_COLORS = {
  'Technology': 'bg-blue-500/20 text-blue-400',
  'Finance': 'bg-green-500/20 text-green-400',
  'Healthcare': 'bg-red-500/20 text-red-400',
  'Education': 'bg-yellow-500/20 text-yellow-400',
  'Retail': 'bg-orange-500/20 text-orange-400',
  'Manufacturing': 'bg-purple-500/20 text-purple-400',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const [ws, comps, projs] = await Promise.all([
        api.get('/workspaces'),
        api.get('/companies'),
        api.get('/projects'),
      ]);
      setWorkspaceId(ws[0]?.id || '');
      setCompanies(comps);
      setAllProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshViewing(id) {
    try {
      const c = await api.get(`/companies/${id}`);
      setViewing(c);
      setCompanies(prev => prev.map(x => x.id === id ? { ...x, ...c } : x));
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
    await api.post('/companies', { ...data, workspace_id: workspaceId });
    setModalOpen(false);
    load();
    showToast('Company created', 'success');
  }

  async function handleEdit(data) {
    await api.put(`/companies/${editing.id}`, data);
    setEditing(null);
    load();
    showToast('Company updated', 'success');
  }

  async function handleDelete(id) {
    setViewing(null);
    await api.delete(`/companies/${id}`);
    setConfirmDelete(null);
    load();
    showToast('Company deleted', 'success');
  }

  async function handleLinkProject(companyId, projectId) {
    await api.post(`/companies/${companyId}/projects`, { project_id: projectId });
    await refreshViewing(companyId);
  }

  async function handleUnlinkProject(companyId, projectId) {
    await api.delete(`/companies/${companyId}/projects/${projectId}`);
    await refreshViewing(companyId);
  }

  async function openDetail(company) {
    const detail = await api.get(`/companies/${company.id}`);
    setViewing(detail);
  }

  const filtered = companies.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-gray-400 mt-1">Manage clients and organizations associated with your projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…" className="pl-9 pr-3 py-2 bg-[#16181c] border border-[#2a2d35] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48" />
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
            <Plus size={16} /> New Company
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500"><Loader size={20} className="animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">{search ? 'No matching companies' : 'No companies yet'}</p>
          {!search && <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add Company</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(company => (
            <div
              key={company.id}
              onClick={() => openDetail(company)}
              className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] cursor-pointer transition-all hover:bg-[#1a1c22] group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center text-base font-bold text-blue-300">
                  {company.name[0].toUpperCase()}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); setEditing(company); }} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(company.id); }} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 truncate">{company.name}</h3>
              {company.description && <p className="text-sm text-gray-400 mb-2 line-clamp-2">{company.description}</p>}
              <div className="flex items-center gap-2 flex-wrap mt-auto">
                {company.industry && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INDUSTRY_COLORS[company.industry] || 'bg-gray-500/20 text-gray-400'}`}>
                    {company.industry}
                  </span>
                )}
                {company.company_size && <span className="text-xs text-gray-500">{company.company_size} employees</span>}
                {company.website && (
                  <ExternalLink size={11} className="text-gray-600 ml-auto" />
                )}
              </div>
              {company.contact_email && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <Mail size={10} /> {company.contact_name || company.contact_email}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Company" size="lg">
        <CompanyForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Company" size="lg">
        {editing && <CompanyForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => handleDelete(confirmDelete)}
        title="Delete Company"
        message="Are you sure? All project associations will be removed."
        confirmLabel="Delete Company"
      />

      {viewing && (
        <CompanyDetailDrawer
          company={viewing}
          allProjects={allProjects}
          onClose={() => setViewing(null)}
          onEdit={c => { setViewing(null); setEditing(c); }}
          onDelete={id => { setViewing(null); setConfirmDelete(id); }}
          onLinkProject={handleLinkProject}
          onUnlinkProject={handleUnlinkProject}
        />
      )}
    </div>
  );
}
