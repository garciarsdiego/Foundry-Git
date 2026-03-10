import React, { useState, useEffect } from 'react';
import { Plus, Cloud, Loader, Pencil, Trash2 } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI', desc: 'GPT-4o, GPT-4 Turbo, and more' },
  { value: 'anthropic', label: 'Anthropic', desc: 'Claude 3.5 Sonnet, Claude 3 Opus' },
  { value: 'google', label: 'Google', desc: 'Gemini 1.5 Pro, Gemini Flash' },
  { value: 'openrouter', label: 'OpenRouter', desc: 'Unified access to 100+ models' },
  { value: 'minimax', label: 'MiniMax', desc: 'MiniMax models' },
  { value: 'glm', label: 'GLM / Z.ai', desc: 'ChatGLM and Z.ai models' },
];

function ProviderForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    provider_type: initial.provider_type || 'openai',
    base_url: initial.base_url || '',
    api_key_env_var: initial.api_key_env_var || '',
    model: initial.model || '',
    is_default: initial.is_default || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const DEFAULTS = {
    openai: { model: 'gpt-4o', env: 'OPENAI_API_KEY' },
    anthropic: { model: 'claude-3-5-sonnet-20241022', env: 'ANTHROPIC_API_KEY' },
    google: { model: 'gemini-1.5-pro', env: 'GOOGLE_API_KEY' },
    openrouter: { model: 'openai/gpt-4o', env: 'OPENROUTER_API_KEY' },
    minimax: { model: 'MiniMax-Text-01', env: 'MINIMAX_API_KEY' },
    glm: { model: 'glm-4', env: 'GLM_API_KEY' },
  };

  function handleTypeChange(type) {
    const defaults = DEFAULTS[type] || {};
    setForm(f => ({
      ...f,
      provider_type: type,
      model: f.model || defaults.model || '',
      api_key_env_var: f.api_key_env_var || defaults.env || '',
    }));
  }

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
        <input value={form.name} onChange={set('name')} placeholder="My Provider" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">Provider Type *</label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => handleTypeChange(pt.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                form.provider_type === pt.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-[#2a2d35] hover:border-[#3a3d45]'
              }`}
            >
              <div className={`text-sm font-medium ${form.provider_type === pt.value ? 'text-blue-300' : 'text-white'}`}>{pt.label}</div>
              <div className="text-xs text-gray-500">{pt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">API Key Env Var</label>
        <input value={form.api_key_env_var} onChange={set('api_key_env_var')} placeholder="OPENAI_API_KEY" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
        <p className="text-xs text-gray-600 mt-1">Environment variable name containing the API key</p>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Model</label>
        <input value={form.model} onChange={set('model')} placeholder="gpt-4o" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Base URL <span className="text-gray-600">(override, optional)</span></label>
        <input value={form.base_url} onChange={set('base_url')} placeholder="https://api.openai.com/v1" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_default" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="rounded" />
        <label htmlFor="is_default" className="text-sm text-gray-400">Set as default provider</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Provider' : 'Create Provider'}
        </button>
      </div>
    </form>
  );
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('');

  async function load() {
    try {
      const [ws, provs] = await Promise.all([api.get('/workspaces'), api.get('/providers')]);
      setWorkspaceId(ws[0]?.id || '');
      setProviders(provs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
    await api.post('/providers', { ...data, workspace_id: workspaceId });
    setModalOpen(false);
    load();
  }

  async function handleEdit(data) {
    await api.put(`/providers/${editing.id}`, data);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this provider config?')) return;
    await api.delete(`/providers/${id}`);
    load();
  }

  const getProviderLabel = (type) => PROVIDER_TYPES.find(p => p.value === type)?.label || type;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Providers</h1>
          <p className="text-gray-400 mt-1">Configure AI provider connections (OpenAI, Anthropic, Google, etc.)</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Provider
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Cloud size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No providers configured</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add Provider</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(prov => (
            <div key={prov.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Cloud size={16} className="text-blue-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(prov)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(prov.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{prov.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{getProviderLabel(prov.provider_type)}</span>
                {prov.is_default ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">default</span> : null}
              </div>
              {prov.model && <p className="text-xs text-gray-500 mt-2">{prov.model}</p>}
              {prov.api_key_env_var && <p className="text-xs text-gray-600 mt-1 font-mono">{prov.api_key_env_var}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Provider Config" size="lg">
        <ProviderForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Provider Config" size="lg">
        {editing && <ProviderForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
