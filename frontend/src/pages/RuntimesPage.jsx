import React, { useState, useEffect } from 'react';
import { Plus, Cpu, Loader, Pencil, Trash2 } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

const RUNTIME_TYPES = [
  { value: 'codex', label: 'Codex CLI' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
  { value: 'kimi-code', label: 'Kimi Code' },
  { value: 'kilo-code', label: 'Kilo Code' },
];

function RuntimeForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    runtime_type: initial.runtime_type || 'codex',
    binary_path: initial.binary_path || '',
    extra_args: initial.extra_args || '',
    is_default: initial.is_default || false,
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
        <input value={form.name} onChange={set('name')} placeholder="My Runtime" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Runtime Type *</label>
        <select value={form.runtime_type} onChange={set('runtime_type')} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          {RUNTIME_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Binary Path <span className="text-gray-600">(optional)</span></label>
        <input value={form.binary_path} onChange={set('binary_path')} placeholder="/usr/local/bin/codex" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Extra Args <span className="text-gray-600">(optional)</span></label>
        <input value={form.extra_args} onChange={set('extra_args')} placeholder="--model gpt-4o --verbose" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
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

  async function load() {
    try {
      const [ws, rtms] = await Promise.all([api.get('/workspaces'), api.get('/runtimes')]);
      setWorkspaceId(ws[0]?.id || '');
      setRuntimes(rtms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data) {
    await api.post('/runtimes', { ...data, workspace_id: workspaceId });
    setModalOpen(false);
    load();
  }

  async function handleEdit(data) {
    await api.put(`/runtimes/${editing.id}`, data);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this runtime config?')) return;
    await api.delete(`/runtimes/${id}`);
    load();
  }

  const getRuntimeLabel = (type) => RUNTIME_TYPES.find(r => r.value === type)?.label || type;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Runtimes</h1>
          <p className="text-gray-400 mt-1">Configure CLI-based agent runtimes (Codex, Claude Code, etc.)</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Runtime
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <p className="text-sm text-purple-300">
          <strong>Runtimes</strong> are CLI tools that execute agent tasks locally. Supported: Codex CLI, Claude Code, Gemini CLI, Kimi Code, and Kilo Code. Each runtime requires the binary to be installed on the server.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : runtimes.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Cpu size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No runtimes configured</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add Runtime</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runtimes.map(rt => (
            <div key={rt.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Cpu size={16} className="text-purple-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing(rt)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(rt.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{rt.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{getRuntimeLabel(rt.runtime_type)}</span>
                {rt.is_default ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">default</span> : null}
              </div>
              {rt.binary_path && <p className="text-xs text-gray-500 mt-2 font-mono truncate">{rt.binary_path}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Runtime Config">
        <RuntimeForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Runtime Config">
        {editing && <RuntimeForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
