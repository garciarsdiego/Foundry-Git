import React, { useState, useEffect } from 'react';
import { Plus, Bot, Loader, Pencil, Trash2, Cpu, Cloud, Search, LayoutTemplate, Download, Brain, X, Star } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

const EXECUTION_MODES = ['provider', 'runtime'];

const CATEGORY_META = {
  engineering: { label: 'Engineering', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  product: { label: 'Product', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  documentation: { label: 'Docs', color: 'text-green-400', bg: 'bg-green-500/20' },
  security: { label: 'Security', color: 'text-red-400', bg: 'bg-red-500/20' },
  data: { label: 'Data', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  research: { label: 'Research', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  design: { label: 'Design', color: 'text-pink-400', bg: 'bg-pink-500/20' },
  orchestration: { label: 'Orchestration', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  automation: { label: 'Automation', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
};

function AgentForm({ initial = {}, providers, runtimes, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    execution_mode: initial.execution_mode || 'provider',
    provider_config_id: initial.provider_config_id || '',
    runtime_config_id: initial.runtime_config_id || '',
    fallback_provider_config_id: initial.fallback_provider_config_id || '',
    system_prompt: initial.system_prompt || '',
    monthly_budget_usd: initial.monthly_budget_usd !== null && initial.monthly_budget_usd !== undefined ? String(initial.monthly_budget_usd) : '',
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
      const payload = {
        ...form,
        monthly_budget_usd: form.monthly_budget_usd ? parseFloat(form.monthly_budget_usd) : null,
      };
      await onSubmit(payload);
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
        <label className="block text-sm text-gray-400 mb-1">Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="My Agent" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <input value={form.description} onChange={set('description')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Execution Mode</label>
        <select value={form.execution_mode} onChange={set('execution_mode')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="provider">Provider (API call)</option>
          <option value="runtime">Runtime (CLI tool)</option>
        </select>
      </div>
      {form.execution_mode === 'provider' ? (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Provider Config</label>
          <select value={form.provider_config_id} onChange={set('provider_config_id')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select provider...</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.provider_type})</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Runtime Config</label>
          <select value={form.runtime_config_id} onChange={set('runtime_config_id')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select runtime...</option>
            {runtimes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.runtime_type})</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Fallback Provider (optional)</label>
        <select value={form.fallback_provider_config_id} onChange={set('fallback_provider_config_id')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">None</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.provider_type})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">System Prompt</label>
        <textarea value={form.system_prompt} onChange={set('system_prompt')} rows={3} placeholder="You are a helpful coding assistant..." className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Monthly Budget (USD) <span className="text-gray-600">optional</span></label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <input type="number" min="0" step="0.01" value={form.monthly_budget_usd} onChange={set('monthly_budget_usd')} placeholder="e.g. 10.00" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <p className="text-xs text-gray-600 mt-1">Agent will show a budget warning when spending approaches this limit.</p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
}

const IMPORTANCE_LABELS = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical' };
const IMPORTANCE_COLORS = { 1: 'text-gray-500', 2: 'text-gray-400', 3: 'text-blue-400', 4: 'text-yellow-400', 5: 'text-red-400' };

function MemoryForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    memory_key: initial.memory_key || '',
    content: initial.content || '',
    importance: initial.importance ?? 2,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.memory_key.trim()) return setError('Key is required');
    if (!form.content.trim()) return setError('Content is required');
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, importance: Number(form.importance) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Key *</label>
        <input value={form.memory_key} onChange={set('memory_key')} placeholder="e.g. preferred_language" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Content *</label>
        <textarea value={form.content} onChange={set('content')} rows={3} placeholder="What the agent should remember…" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Importance</label>
        <select value={form.importance} onChange={set('importance')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} — {IMPORTANCE_LABELS[v]}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : initial.id ? 'Update' : 'Add Memory'}
        </button>
      </div>
    </form>
  );
}

function AgentMemoryPanel({ agent, onClose }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingMem, setEditingMem] = useState(null);
  const [confirmDeleteMem, setConfirmDeleteMem] = useState(null);
  const toast = useToast();

  async function loadMemories() {
    try {
      const data = await api.get(`/agents/${agent.id}/memories`);
      setMemories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMemories(); }, [agent.id]);

  async function handleAdd(data) {
    await api.post(`/agents/${agent.id}/memories`, data);
    setAddOpen(false);
    loadMemories();
    toast('Memory saved', 'success');
  }

  async function handleEdit(data) {
    await api.put(`/agents/${agent.id}/memories/${editingMem.id}`, data);
    setEditingMem(null);
    loadMemories();
    toast('Memory updated', 'success');
  }

  async function handleDelete() {
    await api.delete(`/agents/${agent.id}/memories/${confirmDeleteMem}`);
    setConfirmDeleteMem(null);
    loadMemories();
    toast('Memory deleted', 'success');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-[#16181c] border border-[#2a2d35] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d35]">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-400" />
            <span className="font-semibold text-white text-sm">{agent.name} — Memories</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs transition-colors">
              <Plus size={12} /> Add
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500"><Loader size={16} className="animate-spin mr-2" /> Loading…</div>
          ) : memories.length === 0 && !addOpen ? (
            <div className="text-center py-10">
              <Brain size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-400">No memories yet</p>
              <p className="text-xs text-gray-600 mt-1">Memories are injected into the agent's context during chat.</p>
            </div>
          ) : (
            memories.map(mem => (
              <div key={mem.id} className="bg-[#0d0d0f] border border-[#2a2d35] rounded-xl p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{mem.memory_key}</span>
                      <span className={`text-xs flex items-center gap-1 ${IMPORTANCE_COLORS[mem.importance] || 'text-gray-500'}`}>
                        <Star size={10} fill="currentColor" />{IMPORTANCE_LABELS[mem.importance] || mem.importance}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{mem.content}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setEditingMem(mem)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={12} /></button>
                    <button onClick={() => setConfirmDeleteMem(mem.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))
          )}

          {addOpen && (
            <div className="bg-[#0d0d0f] border border-blue-500/30 rounded-xl p-4">
              <p className="text-xs text-blue-400 font-medium mb-3">New Memory</p>
              <MemoryForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={!!editingMem} onClose={() => setEditingMem(null)} title="Edit Memory">
        {editingMem && <MemoryForm initial={editingMem} onSubmit={handleEdit} onCancel={() => setEditingMem(null)} />}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDeleteMem}
        onClose={() => setConfirmDeleteMem(null)}
        onConfirm={handleDelete}
        title="Delete Memory"
        message="Are you sure you want to delete this memory? This cannot be undone."
        confirmLabel="Delete Memory"
      />
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [runtimes, setRuntimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('agents');
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [deployingId, setDeployingId] = useState(null);
  const [memoryAgent, setMemoryAgent] = useState(null);
  const toast = useToast();

  async function load() {
    try {
      const [ws, agts, provs, rtms] = await Promise.all([
        api.get('/workspaces'),
        api.get('/agents'),
        api.get('/providers'),
        api.get('/runtimes'),
      ]);
      setWorkspaceId(ws[0]?.id || '');
      setAgents(agts);
      setProviders(provs);
      setRuntimes(rtms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    if (templates.length) return;
    setTemplatesLoading(true);
    try {
      const data = await api.get('/agents/templates');
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'templates') loadTemplates(); }, [tab]);

  async function handleCreate(data) {
    await api.post('/agents', { ...data, workspace_id: workspaceId });
    setModalOpen(false);
    load();
  }

  async function handleEdit(data) {
    await api.put(`/agents/${editing.id}`, data);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    setConfirmDelete(id);
  }

  async function confirmDeleteAgent() {
    await api.delete(`/agents/${confirmDelete}`);
    load();
  }

  async function deployTemplate(tpl) {
    if (!workspaceId) return toast('No workspace found', 'error');
    setDeployingId(tpl.id);
    try {
      await api.post('/agents', {
        workspace_id: workspaceId,
        name: tpl.name,
        description: tpl.description,
        execution_mode: tpl.execution_mode || 'provider',
        system_prompt: tpl.system_prompt || null,
      });
      toast(`Agent "${tpl.name}" deployed`, 'success');
      setTab('agents');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeployingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">Configure AI agents powered by providers or runtime CLIs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="pl-9 pr-3 py-2 bg-[#16181c] border border-[#2a2d35] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
            <Plus size={16} /> New Agent
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2a2d35]">
        {[{ value: 'agents', label: 'My Agents', Icon: Bot }, { value: 'templates', label: 'Templates', Icon: LayoutTemplate }].map(t => (
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

      {tab === 'agents' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader size={20} className="animate-spin mr-2" /> Loading...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Bot size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-400 mb-2">No agents yet</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Agent</button>
                <button onClick={() => setTab('templates')} className="px-4 py-2 bg-[#16181c] border border-[#2a2d35] hover:border-blue-500/40 text-gray-300 rounded-lg text-sm flex items-center gap-2">
                  <LayoutTemplate size={14} /> Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.description || '').toLowerCase().includes(search.toLowerCase())).map(agent => (
                <div key={agent.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${agent.execution_mode === 'runtime' ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}>
                      {agent.execution_mode === 'runtime' ? <Cpu size={16} className="text-purple-400" /> : <Cloud size={16} className="text-blue-400" />}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => setMemoryAgent(agent)} className="p-1.5 rounded text-gray-500 hover:text-purple-400 hover:bg-purple-500/10" title="Memories"><Brain size={13} /></button>
                      <button onClick={() => setEditing(agent)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(agent.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{agent.name}</h3>
                  {agent.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>}
                  <div className="flex items-center gap-2 mt-auto">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${agent.execution_mode === 'runtime' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {agent.execution_mode}
                    </span>
                    {(agent.provider_name || agent.runtime_name) && (
                      <span className="text-xs text-gray-500">{agent.provider_name || agent.runtime_name}</span>
                    )}
                    {agent.monthly_budget_usd && (
                      <span className="text-xs text-gray-600 ml-auto">${agent.monthly_budget_usd}/mo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'templates' && (
        <div>
          <p className="text-sm text-gray-400 mb-6">
            Pre-configured agents ready to deploy. Each template includes a curated system prompt — you can customise it after deployment.
          </p>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader size={20} className="animate-spin mr-2" /> Loading templates...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tpl => {
                const meta = CATEGORY_META[tpl.category] || { label: tpl.category, color: 'text-gray-400', bg: 'bg-gray-500/20' };
                return (
                  <div key={tpl.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.bg}`}>
                        <Bot size={16} className={meta.color} />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{tpl.name}</h3>
                    <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-3">{tpl.description}</p>
                    <button
                      onClick={() => deployTemplate(tpl)}
                      disabled={deployingId === tpl.id}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 hover:border-blue-500/60 text-blue-300 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {deployingId === tpl.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                      {deployingId === tpl.id ? 'Deploying…' : 'Deploy Agent'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Agent" size="lg">
        <AgentForm providers={providers} runtimes={runtimes} onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Agent" size="lg">
        {editing && <AgentForm initial={editing} providers={providers} runtimes={runtimes} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAgent}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This cannot be undone."
        confirmLabel="Delete Agent"
      />
      {memoryAgent && <AgentMemoryPanel agent={memoryAgent} onClose={() => setMemoryAgent(null)} />}
    </div>
  );
}
