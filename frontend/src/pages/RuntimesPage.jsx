import React, { useState, useEffect } from 'react';
import { Plus, Cpu, Loader, Pencil, Trash2, ExternalLink, Terminal, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const RUNTIME_TYPES = [
  {
    value: 'opencode',
    label: 'OpenCode',
    description: 'Multi-provider agentic CLI. Orchestrates Claude, GPT, Gemini, Kimi & more.',
    invocation: 'opencode run "<prompt>"',
    install: 'https://opencode.ai/docs',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  {
    value: 'claude-code',
    label: 'Claude Code',
    description: "Anthropic's official agentic coding CLI.",
    invocation: 'claude -p "<prompt>"',
    install: 'https://docs.anthropic.com/en/docs/claude-code',
    badge: 'bg-orange-500/20 text-orange-400',
  },
  {
    value: 'codex',
    label: 'Codex CLI',
    description: "OpenAI's open-source coding agent CLI.",
    invocation: 'codex "<prompt>"',
    install: 'https://github.com/openai/codex',
    badge: 'bg-green-500/20 text-green-400',
  },
  {
    value: 'gemini-cli',
    label: 'Gemini CLI',
    description: "Google's Gemini agentic coding CLI.",
    invocation: 'gemini -p "<prompt>"',
    install: 'https://github.com/google-gemini/gemini-cli',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    value: 'kimi-code',
    label: 'Kimi Code',
    description: "Moonshot AI's Kimi coding agent CLI.",
    invocation: 'kimi (stdin)',
    install: 'https://www.kimi.com',
    badge: 'bg-purple-500/20 text-purple-400',
  },
  {
    value: 'kilo-code',
    label: 'Kilo Code',
    description: 'VS Code fork AI coding assistant CLI.',
    invocation: 'kilo (stdin)',
    install: 'https://kilocode.ai',
    badge: 'bg-pink-500/20 text-pink-400',
  },
];

function RuntimeForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    runtime_type: initial.runtime_type || 'opencode',
    binary_path: initial.binary_path || '',
    extra_args: initial.extra_args || '',
    is_default: initial.is_default || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const selected = RUNTIME_TYPES.find(r => r.value === form.runtime_type);

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
        <input value={form.name} onChange={set('name')} placeholder="My Runtime" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Runtime Type *</label>
        <select value={form.runtime_type} onChange={set('runtime_type')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          {RUNTIME_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
        </select>
        {selected && (
          <div className="mt-2 bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 space-y-1">
            <p className="text-xs text-gray-400">{selected.description}</p>
            <p className="text-xs text-gray-500 font-mono">Invocation: <span className="text-blue-400">{selected.invocation}</span></p>
            <a href={selected.install} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Installation guide <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Binary Path <span className="text-gray-600">(optional — overrides default)</span>
        </label>
        <input
          value={form.binary_path}
          onChange={set('binary_path')}
          placeholder={selected ? `/usr/local/bin/${selected.value === 'claude-code' ? 'claude' : selected.value === 'gemini-cli' ? 'gemini' : selected.value}` : '/usr/local/bin/...'}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Extra Args <span className="text-gray-600">(optional — appended to invocation)</span>
        </label>
        <input
          value={form.extra_args}
          onChange={set('extra_args')}
          placeholder={
            form.runtime_type === 'opencode'    ? '--model anthropic/claude-sonnet-4-5  (or openai/gpt-4o, google/gemini-2.5-pro, groq/llama-3.3-70b-versatile)' :
            form.runtime_type === 'claude-code' ? '--model claude-opus-4-5  (or claude-sonnet-4-5, claude-haiku-4-5)' :
            form.runtime_type === 'codex'       ? '--model o4-mini  (or o3-mini, gpt-4o)' :
            form.runtime_type === 'gemini-cli'  ? '--model gemini-2.5-pro  (or gemini-2.5-flash, gemini-1.5-pro)' :
            form.runtime_type === 'kimi-code'   ? '(Kimi reads MOONSHOT_API_KEY; no model flag needed)' :
            form.runtime_type === 'kilo-code'   ? '(Kilo Code uses its own VS Code settings; no model flag needed)' :
            '--verbose'
          }
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_default" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="rounded" />
        <label htmlFor="is_default" className="text-sm text-gray-400">Set as default runtime</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Runtime' : 'Create Runtime'}
        </button>
      </div>
    </form>
  );
}

export default function RuntimesPage() {
  const [runtimes, setRuntimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [checkStatuses, setCheckStatuses] = useState({});

  async function checkRuntime(id) {
    setCheckStatuses(s => ({ ...s, [id]: { checking: true } }));
    try {
      const result = await api.get(`/runtimes/${id}/check`);
      setCheckStatuses(s => ({ ...s, [id]: { checking: false, ...result } }));
    } catch (err) {
      console.error(`Failed to check runtime ${id}:`, err);
      setCheckStatuses(s => ({ ...s, [id]: { checking: false, available: null, path: null } }));
    }
  }

  async function load() {
    try {
      const [ws, rtms] = await Promise.all([api.get('/workspaces'), api.get('/runtimes')]);
      setWorkspaceId(ws[0]?.id || '');
      setRuntimes(rtms);
      // Auto-check every configured runtime
      rtms.forEach(rt => checkRuntime(rt.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
    const created = await api.post('/runtimes', { ...data, workspace_id: workspaceId });
    setModalOpen(false);
    load();
    if (created?.id) checkRuntime(created.id);
  }

  async function handleEdit(data) {
    await api.put(`/runtimes/${editing.id}`, data);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    setConfirmDelete(id);
  }

  async function confirmDeleteRuntime() {
    await api.delete(`/runtimes/${confirmDelete}`);
    load();
  }

  const getRuntimeMeta = (type) => RUNTIME_TYPES.find(r => r.value === type);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Runtimes</h1>
          <p className="text-gray-400 mt-1">Configure CLI-based agent runtimes</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Runtime
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Terminal size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <strong>Runtimes</strong> are CLI tools installed on the server that execute agentic coding tasks.
          Each runtime is invoked in headless mode and streams output as run events.
          Foundry supports <strong>OpenCode</strong> (recommended — supports Claude, GPT, Gemini, Kimi, Groq, NVIDIA), Claude Code, Codex CLI, Gemini CLI, Kimi Code, and Kilo Code.
          {' '}<a href="https://github.com/code-yeongyu/oh-my-openagent" target="_blank" rel="noreferrer" className="underline hover:text-blue-200">See oh-my-openagent</a> for multi-provider OpenCode setup.
        </div>
      </div>

      {/* Runtime type reference cards */}
      {runtimes.length === 0 && !loading && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RUNTIME_TYPES.map(rt => (
            <div key={rt.value} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rt.badge}`}>{rt.label}</span>
                <a href={rt.install} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-400 transition-colors">
                  <ExternalLink size={13} />
                </a>
              </div>
              <p className="text-xs text-gray-400 mb-2">{rt.description}</p>
              <code className="text-xs text-gray-500 font-mono">{rt.invocation}</code>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : runtimes.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No runtimes configured</p>
          <p className="text-sm text-gray-600 mb-4">Install a CLI tool above and add it here to start running agents.</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add Runtime</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runtimes.map(rt => {
            const meta = getRuntimeMeta(rt.runtime_type);
            const status = checkStatuses[rt.id];
            return (
              <div key={rt.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Cpu size={16} className="text-purple-400" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => checkRuntime(rt.id)} title="Check binary availability" className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"><RefreshCw size={13} /></button>
                    <button onClick={() => setEditing(rt)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(rt.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{rt.name}</h3>
                {meta?.description && <p className="text-xs text-gray-500 mb-2">{meta.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.badge || 'bg-gray-500/20 text-gray-400'}`}>{meta?.label || rt.runtime_type}</span>
                  {rt.is_default ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">default</span> : null}
                  {status?.checking ? (
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Loader size={11} className="animate-spin" /> checking…</span>
                  ) : status?.available === true ? (
                    <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={11} /> installed</span>
                  ) : status?.available === false ? (
                    <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={11} /> not found</span>
                  ) : status?.available === null ? (
                    <span className="flex items-center gap-1 text-xs text-yellow-500"><XCircle size={11} /> check failed</span>
                  ) : null}
                </div>
                {rt.binary_path && <p className="text-xs text-gray-500 mt-2 font-mono truncate">{rt.binary_path}</p>}
                {!rt.binary_path && status?.path && (
                  <p className="text-xs text-gray-600 mt-1 font-mono truncate" title={status.path}>{status.path}</p>
                )}
                {meta && (
                  <p className="text-xs text-gray-600 font-mono mt-1">{meta.invocation}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Runtime Config">
        <RuntimeForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Runtime Config">
        {editing && <RuntimeForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteRuntime}
        title="Delete Runtime"
        message="Are you sure you want to delete this runtime configuration?"
        confirmLabel="Delete Runtime"
      />
    </div>
  );
}

