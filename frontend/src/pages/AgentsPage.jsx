import React, { useState, useEffect } from 'react';
import { Plus, Bot, Loader, Pencil, Trash2, Cpu, Cloud } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

const EXECUTION_MODES = ['provider', 'runtime'];

function AgentForm({ initial = {}, providers, runtimes, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    execution_mode: initial.execution_mode || 'provider',
    provider_config_id: initial.provider_config_id || '',
    runtime_config_id: initial.runtime_config_id || '',
    fallback_provider_config_id: initial.fallback_provider_config_id || '',
    system_prompt: initial.system_prompt || '',
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
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
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

  useEffect(() => { load(); }, []);

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
    if (!confirm('Delete this agent?')) return;
    await api.delete(`/agents/${id}`);
    load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">Configure AI agents powered by providers or runtime CLIs</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Agent
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Bot size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No agents yet</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Agent</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${agent.execution_mode === 'runtime' ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}>
                  {agent.execution_mode === 'runtime' ? <Cpu size={16} className="text-purple-400" /> : <Cloud size={16} className="text-blue-400" />}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Agent" size="lg">
        <AgentForm providers={providers} runtimes={runtimes} onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Agent" size="lg">
        {editing && <AgentForm initial={editing} providers={providers} runtimes={runtimes} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
