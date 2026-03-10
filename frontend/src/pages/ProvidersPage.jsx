import React, { useState, useEffect } from 'react';
import { Plus, Cloud, Loader, Pencil, Trash2, Key, Eye, EyeOff } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI', desc: 'GPT-4o, o4-mini, o3, gpt-5 and more' },
  { value: 'anthropic', label: 'Anthropic', desc: 'claude-opus-4-6 (1M), claude-sonnet-4-6 (1M), claude-haiku-4-5' },
  { value: 'google', label: 'Google', desc: 'gemini-3.1-pro-preview, gemini-2.5-pro, Flash and more' },
  { value: 'openrouter', label: 'OpenRouter', desc: 'Unified access to 500+ models' },
  { value: 'minimax', label: 'MiniMax', desc: 'minimax-m2.5, m2.1 — MiniMax Coding Plan' },
  { value: 'glm', label: 'GLM / Z.ai', desc: 'GLM-5, GLM-4.7, GLM-4.5 — Z.AI Coding Plan' },
  { value: 'nvidia', label: 'NVIDIA NIM', desc: 'Nemotron, Meta Llama 4, Mistral, DeepSeek, Qwen & more' },
  { value: 'groq', label: 'Groq', desc: 'Llama 4, GPT-OSS, Kimi, Qwen — ultra-fast inference' },
  { value: 'kimi', label: 'Kimi (Moonshot)', desc: 'kimi-k2.5, kimi-k2-instruct — Kimi Coding Plan' },
];

/** Suggested models per provider shown as datalist options. */
const PROVIDER_MODELS = {
  openai: [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
    'o4-mini', 'o4-mini-high', 'o3', 'o3-mini',
    'codex-mini-latest', 'gpt-5', 'gpt-5-codex', 'gpt-5-nano',
    'gpt-5.1', 'gpt-5.1-codex', 'gpt-5.1-codex-mini', 'gpt-5.2', 'gpt-5.3-codex',
    'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-codex',
  ],
  anthropic: [
    'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5',
    'claude-opus-4-5', 'claude-sonnet-4-5',
    'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307',
  ],
  google: [
    'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
    'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro',
  ],
  openrouter: [
    'anthropic/claude-opus-4-6', 'anthropic/claude-sonnet-4-6',
    'openai/gpt-5.4-pro', 'openai/gpt-5.4', 'openai/gpt-4o', 'openai/gpt-4o-mini',
    'google/gemini-3.1-pro-preview', 'google/gemini-2.5-pro',
    'meta-llama/llama-4-maverick-17b-128e-instruct', 'meta-llama/llama-4-scout-17b-16e-instruct',
    'moonshotai/kimi-k2.5', 'deepseek/deepseek-r1', 'qwen/qwen3-coder-480b-a35b',
    'mistralai/mistral-large-3', 'mistralai/mixtral-8x7b-instruct',
  ],
  minimax: [
    'minimax-m2.5', 'minimax-m2.5-highspeed', 'minimax-m2.1', 'minimax-m2',
    'MiniMax-Text-01', 'abab6.5s-chat', 'abab5.5-chat',
  ],
  glm: [
    'glm-5', 'glm-4.7', 'glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4.7-flash',
    'glm-4', 'glm-4-plus', 'glm-4-long', 'glm-3-turbo',
  ],
  nvidia: [
    // NVIDIA Nemotron
    'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    'nvidia/llama-3.3-nemotron-super-49b-v1',
    'nvidia/nemotron-3-nano-30b-a3b',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'nvidia/llama-3.1-nemotron-nano-8b-v1',
    // Meta Llama
    'meta/llama-4-maverick-17b-128e-instruct',
    'meta/llama-4-scout-17b-16e-instruct',
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    // Mistral AI
    'mistralai/mistral-large-3',
    'mistralai/devstral-2-123b-instruct-2512',
    'mistralai/mixtral-8x7b-instruct',
    'mistralai/mistral-7b-instruct-v0.3',
    'mistralai/mistral-nemo-12b-instruct',
    // DeepSeek
    'deepseek-ai/deepseek-v3.2',
    'deepseek-ai/deepseek-r1',
    'deepseek-ai/deepseek-r1-distill-qwen-32b',
    'deepseek-ai/deepseek-r1-distill-qwen-14b',
    'deepseek-ai/deepseek-r1-distill-qwen-7b',
    'deepseek-ai/deepseek-r1-distill-llama-8b',
    // Qwen (Alibaba)
    'qwen/qwen3.5-397b-a17b',
    'qwen/qwen3.5-122b-a10b',
    'qwen/qwen3-coder-480b-a35b',
    'qwen/qwen3-next-instruct',
    'qwen/qwen2.5-coder-32b-instruct',
    // Other providers on NVIDIA NIM
    'z-ai/glm5', 'z-ai/glm4.7',
    'minimaxai/minimax-m2.5', 'minimaxai/minimax-m2.1',
    'moonshotai/kimi-k2.5', 'moonshotai/kimi-k2-thinking',
    'stepfun-ai/step-3.5-flash',
    'microsoft/phi-4', 'microsoft/phi-4-mini-instruct',
    'google/gemma-3-27b-it', 'google/gemma-3-12b-it',
  ],
  groq: [
    // OpenAI on Groq
    'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b',
    // Kimi on Groq
    'moonshotai/kimi-k2-instruct-0905',
    // Meta Llama 4
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    // Qwen
    'qwen/qwen3-32b', 'qwen-qwq-32b',
    // Llama 3
    'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
    'llama3-70b-8192', 'llama3-8b-8192',
    // DeepSeek
    'deepseek-r1-distill-llama-70b',
    // Google
    'gemma2-9b-it',
    // Agentic
    'compound-beta',
    // ASR
    'whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en',
  ],
  kimi: [
    'kimi-k2.5', 'kimi-k2-instruct',
    'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k',
  ],
};

function ProviderForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    provider_type: initial.provider_type || 'openai',
    base_url: initial.base_url || '',
    api_key_env_var: initial.api_key_env_var || '',
    api_key: '',
    model: initial.model || '',
    is_default: initial.is_default || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const DEFAULTS = {
    openai:    { model: 'gpt-4o',                              env: 'OPENAI_API_KEY' },
    anthropic: { model: 'claude-sonnet-4-6',                   env: 'ANTHROPIC_API_KEY' },
    google:    { model: 'gemini-3.1-pro-preview',              env: 'GOOGLE_API_KEY' },
    openrouter:{ model: 'anthropic/claude-sonnet-4-6',         env: 'OPENROUTER_API_KEY' },
    minimax:   { model: 'minimax-m2.5',                        env: 'MINIMAX_API_KEY' },
    glm:       { model: 'glm-5',                               env: 'GLM_API_KEY' },
    nvidia:    { model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', env: 'NVIDIA_API_KEY' },
    groq:      { model: 'llama-3.3-70b-versatile',             env: 'GROQ_API_KEY' },
    kimi:      { model: 'kimi-k2.5',                           env: 'MOONSHOT_API_KEY' },
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

  const modelListId = `model-list-${form.provider_type}`;
  const modelSuggestions = PROVIDER_MODELS[form.provider_type] || [];

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

      {/* API Key — direct input */}
      <div>
        <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1.5">
          <Key size={13} /> API Key <span className="text-gray-600">(stored securely on server)</span>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={form.api_key}
            onChange={set('api_key')}
            placeholder={initial.api_key_set ? '•••••••• (key stored — leave blank to keep)' : `Paste your ${PROVIDER_TYPES.find(p => p.value === form.provider_type)?.label} API key`}
            className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            tabIndex={-1}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {initial.api_key_set && (
          <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><Key size={11} /> API key is stored. Enter a new value to replace it.</p>
        )}
        <p className="text-xs text-gray-600 mt-1">Alternative: use an environment variable name below instead of pasting the key directly.</p>
      </div>

      {/* API Key env var — alternative */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">API Key Env Var <span className="text-gray-600">(optional — env variable name)</span></label>
        <input value={form.api_key_env_var} onChange={set('api_key_env_var')} placeholder={DEFAULTS[form.provider_type]?.env || 'MY_API_KEY'} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
        <p className="text-xs text-gray-600 mt-1">If set, the value of this server-side environment variable is used instead of the stored key above.</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Model</label>
        {modelSuggestions.length > 0 && (
          <datalist id={modelListId}>
            {modelSuggestions.map(m => <option key={m} value={m} />)}
          </datalist>
        )}
        <input
          list={modelSuggestions.length > 0 ? modelListId : undefined}
          value={form.model}
          onChange={set('model')}
          placeholder={DEFAULTS[form.provider_type]?.model || 'model-name'}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        {modelSuggestions.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">Type or pick from {modelSuggestions.length} suggestions — you can also enter any custom model ID.</p>
        )}
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
  const [confirmDelete, setConfirmDelete] = useState(null);

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
    setConfirmDelete(id);
  }

  async function confirmDeleteProvider() {
    await api.delete(`/providers/${confirmDelete}`);
    load();
  }

  const getProviderLabel = (type) => PROVIDER_TYPES.find(p => p.value === type)?.label || type;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Providers</h1>
          <p className="text-gray-400 mt-1">Configure AI provider connections (OpenAI, Anthropic, Google, NVIDIA, Groq, Kimi, and more)</p>
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
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{getProviderLabel(prov.provider_type)}</span>
                {prov.is_default ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">default</span> : null}
                {prov.api_key_set ? <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Key size={9} /> key stored</span> : null}
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
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteProvider}
        title="Delete Provider"
        message="Are you sure you want to delete this provider configuration?"
        confirmLabel="Delete Provider"
      />
    </div>
  );
}
