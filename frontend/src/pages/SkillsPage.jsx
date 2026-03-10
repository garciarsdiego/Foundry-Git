import React, { useState, useEffect } from 'react';
import { Plus, Zap, Loader, Pencil, Trash2, Wrench, Server, LayoutTemplate, Download } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

const SKILL_TYPES = [
  { value: 'system_prompt', label: 'System Prompt', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', description: 'Reusable system prompt snippet injected into the agent context' },
  { value: 'tool', label: 'Tool Config', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/20', description: 'Tool definition (JSON schema) available to the agent' },
  { value: 'mcp', label: 'MCP Reference', icon: Server, color: 'text-purple-400', bg: 'bg-purple-500/20', description: 'Reference to an MCP server providing tools/resources' },
];

const CATALOG_CATEGORY_META = {
  engineering: { label: 'Engineering', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  design: { label: 'Design', color: 'text-pink-400', bg: 'bg-pink-500/20' },
  research: { label: 'Research', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  security: { label: 'Security', color: 'text-red-400', bg: 'bg-red-500/20' },
  productivity: { label: 'Productivity', color: 'text-green-400', bg: 'bg-green-500/20' },
  tools: { label: 'Tools', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  integrations: { label: 'Integrations', color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

const SKILL_EXAMPLES = {
  system_prompt: `You are an expert code reviewer. When reviewing code:
- Focus on correctness, performance, and security
- Provide specific, actionable feedback
- Reference line numbers in your comments
- Suggest tests for edge cases`,
  tool: `{
  "name": "read_file",
  "description": "Read contents of a file",
  "parameters": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "File path to read" }
    },
    "required": ["path"]
  }
}`,
  mcp: `{
  "server": "github",
  "capabilities": ["list_repos", "create_issue", "search_code"]
}`,
};

function SkillForm({ initial = {}, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    skill_type: initial.skill_type || 'system_prompt',
    content: initial.content || '',
    is_public: initial.is_public || false,
  });

  const typeMeta = SKILL_TYPES.find(t => t.value === form.skill_type);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Name *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Code Reviewer" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Skill Type *</label>
        <div className="grid grid-cols-3 gap-2">
          {SKILL_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => {
                  const prevExample = SKILL_EXAMPLES[f.skill_type] || '';
                  const shouldReplaceContent = !f.content || f.content.trim() === prevExample.trim();
                  return { ...f, skill_type: t.value, content: shouldReplaceContent ? SKILL_EXAMPLES[t.value] : f.content };
                })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors ${form.skill_type === t.value ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-[#2a2d35] text-gray-400 hover:border-[#3a3d45]'}`}
              >
                <Icon size={16} className={form.skill_type === t.value ? t.color : ''} />
                {t.label}
              </button>
            );
          })}
        </div>
        {typeMeta && <p className="text-xs text-gray-500 mt-2">{typeMeta.description}</p>}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this skill do?" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Content</label>
        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={8}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono"
          placeholder={SKILL_EXAMPLES[form.skill_type]}
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_public" checked={!!form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
        <label htmlFor="is_public" className="text-sm text-gray-400">Share in Skills Marketplace</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Skill' : 'Create Skill'}
        </button>
      </div>
    </form>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('mine');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [installingId, setInstallingId] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      const [ws, data] = await Promise.all([api.get('/workspaces'), api.get('/skills')]);
      setWorkspaceId(ws[0]?.id || '');
      setSkills(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog() {
    if (catalog.length) return;
    setCatalogLoading(true);
    try {
      const data = await api.get('/skills/catalog');
      setCatalog(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'catalog') loadCatalog(); }, [tab]);

  async function handleCreate(form) {
    setSaving(true);
    try {
      await api.post('/skills', { ...form, workspace_id: workspaceId });
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(form) {
    setSaving(true);
    try {
      await api.put(`/skills/${editing.id}`, form);
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/skills/${confirmDelete}`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function installFromCatalog(item) {
    if (!workspaceId) return toast('No workspace found', 'error');
    setInstallingId(item.id);
    try {
      await api.post('/skills', {
        workspace_id: workspaceId,
        name: item.name,
        description: item.description,
        skill_type: item.skill_type,
        content: item.content,
        is_public: false,
      });
      toast(`Skill "${item.name}" installed`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setInstallingId(null);
    }
  }

  const filtered = filter === 'all' ? skills : skills.filter(s => s.skill_type === filter);

  const catalogCategories = ['all', ...new Set(catalog.map(s => s.category))];
  const filteredCatalog = catalogFilter === 'all' ? catalog : catalog.filter(s => s.category === catalogFilter);
  const installedNames = new Set(skills.map(s => s.name));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Skills</h1>
          <p className="text-gray-400 mt-1">Reusable capabilities — system prompts, tools, and MCP references</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Skill
        </button>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2a2d35]">
        {[{ value: 'mine', label: 'My Skills', Icon: Zap }, { value: 'catalog', label: 'Catalog', Icon: LayoutTemplate }].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${tab === t.value ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mine' && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 mb-6">
            {[{ value: 'all', label: 'All' }, ...SKILL_TYPES.map(t => ({ value: t.value, label: t.label }))].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f.value ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader size={20} className="animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Zap size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-400 mb-2">No skills yet</p>
              <p className="text-sm text-gray-600 mb-4">Skills are reusable capabilities that can be assigned to agents — system prompt templates, tool configs, and MCP server references.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Skill</button>
                <button onClick={() => setTab('catalog')} className="px-4 py-2 bg-[#16181c] border border-[#2a2d35] hover:border-blue-500/40 text-gray-300 rounded-lg text-sm flex items-center gap-2">
                  <LayoutTemplate size={14} /> Browse Catalog
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(skill => {
                const meta = SKILL_TYPES.find(t => t.value === skill.skill_type);
                const Icon = meta?.icon || Zap;
                return (
                  <div key={skill.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${meta?.bg || 'bg-gray-500/20'} flex items-center justify-center`}>
                        <Icon size={16} className={meta?.color || 'text-gray-400'} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(skill); }} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDelete(skill.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{skill.name}</h3>
                    {skill.description && <p className="text-sm text-gray-400 line-clamp-2 mb-3">{skill.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.bg || 'bg-gray-500/20'} ${meta?.color || 'text-gray-400'}`}>{meta?.label || skill.skill_type}</span>
                      {skill.is_public ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">marketplace</span> : null}
                    </div>
                    {skill.content && (
                      <pre className="mt-3 text-xs text-gray-600 font-mono bg-black/20 rounded p-2 line-clamp-3 overflow-hidden">{skill.content}</pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'catalog' && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Curated skills you can install with one click. Installed skills are added to your workspace and can be assigned to any agent.
          </p>

          {/* Category filter */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {catalogCategories.map(cat => {
              const meta = CATALOG_CATEGORY_META[cat] || { label: cat, color: 'text-gray-400', bg: 'bg-gray-500/20' };
              return (
                <button
                  key={cat}
                  onClick={() => setCatalogFilter(cat)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${catalogFilter === cat ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  {cat === 'all' ? 'All' : meta.label}
                </button>
              );
            })}
          </div>

          {catalogLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader size={20} className="animate-spin mr-2" /> Loading catalog...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map(item => {
                const typeMeta = SKILL_TYPES.find(t => t.value === item.skill_type);
                const catMeta = CATALOG_CATEGORY_META[item.category] || { label: item.category, color: 'text-gray-400', bg: 'bg-gray-500/20' };
                const Icon = typeMeta?.icon || Zap;
                const alreadyInstalled = installedNames.has(item.name);
                return (
                  <div key={item.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeMeta?.bg || 'bg-gray-500/20'}`}>
                        <Icon size={16} className={typeMeta?.color || 'text-gray-400'} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catMeta.bg} ${catMeta.color}`}>{catMeta.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeMeta?.bg || 'bg-gray-500/20'} ${typeMeta?.color || 'text-gray-400'}`}>{typeMeta?.label || item.skill_type}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-3">{item.description}</p>
                    <button
                      onClick={() => !alreadyInstalled && installFromCatalog(item)}
                      disabled={alreadyInstalled || installingId === item.id}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:cursor-not-allowed ${
                        alreadyInstalled
                          ? 'bg-green-600/10 border border-green-500/20 text-green-500 cursor-default'
                          : 'bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-500/60 text-blue-300 disabled:opacity-50'
                      }`}
                    >
                      {installingId === item.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                      {alreadyInstalled ? 'Installed' : installingId === item.id ? 'Installing…' : 'Install'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Skill" size="lg">
        <SkillForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} saving={saving} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Skill" size="lg">
        {editing && <SkillForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} saving={saving} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Skill"
        message="Are you sure you want to delete this skill? It will be removed from all agents."
        confirmLabel="Delete Skill"
      />
    </div>
  );
}
