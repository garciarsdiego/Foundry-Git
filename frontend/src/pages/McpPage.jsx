import React, { useState, useEffect } from 'react';
import { Plus, Server, Loader, Pencil, Trash2, Power, PowerOff, Terminal } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

const TRANSPORT_TYPES = [
  { value: 'stdio', label: 'stdio', description: 'Standard I/O — local process (most common)' },
  { value: 'sse', label: 'SSE', description: 'Server-Sent Events — remote HTTP server' },
  { value: 'http', label: 'HTTP', description: 'HTTP transport — remote JSON-RPC endpoint' },
];

const PRESET_SERVERS = [
  { name: 'GitHub', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], description: 'Manage repositories, issues, and PRs', env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' } },
  { name: 'Filesystem', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allow'], description: 'Read and write files on the local filesystem', env: {} },
  { name: 'Exa Search', command: 'npx', args: ['-y', 'exa-mcp-server'], description: 'Web search via Exa AI', env: { EXA_API_KEY: '' } },
  { name: 'Context7', command: 'npx', args: ['-y', '@upstash/context7-mcp@latest'], description: 'Official library documentation lookup', env: {} },
  { name: 'Postgres', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'], description: 'Query PostgreSQL databases', env: {} },
];

function McpForm({ initial = {}, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    command: initial.command || '',
    args: initial.args_json ? (typeof initial.args_json === 'string' ? initial.args_json : JSON.stringify(initial.args_json)) : '[]',
    env: initial.env_json ? (typeof initial.env_json === 'string' ? initial.env_json : JSON.stringify(initial.env_json, null, 2)) : '{}',
    transport: initial.transport || 'stdio',
    is_enabled: initial.is_enabled !== false,
  });
  const [argsError, setArgsError] = useState('');

  function applyPreset(preset) {
    setForm(f => ({
      ...f,
      name: preset.name,
      description: preset.description,
      command: preset.command,
      args: JSON.stringify(preset.args),
      env: JSON.stringify(preset.env, null, 2),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setArgsError('');
    let args_json, env_json;
    try { args_json = JSON.parse(form.args); } catch { setArgsError('Args must be a valid JSON array'); return; }
    try { env_json = JSON.parse(form.env); } catch { setArgsError('Env must be a valid JSON object'); return; }
    onSubmit({ ...form, args_json, env_json });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Presets */}
      {!initial.id && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Quick Start</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SERVERS.map(p => (
              <button key={p.name} type="button" onClick={() => applyPreset(p)} className="text-xs px-2 py-1 rounded bg-[#0d0d0f] border border-[#2a2d35] text-gray-400 hover:text-white hover:border-blue-500 transition-colors">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="GitHub MCP" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Transport</label>
          <select value={form.transport} onChange={e => setForm(f => ({ ...f, transport: e.target.value }))} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            {TRANSPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.description}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this MCP server provide?" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Command *</label>
        <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} placeholder="npx" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Args <span className="text-gray-600">(JSON array)</span></label>
        <textarea
          value={form.args}
          onChange={e => setForm(f => ({ ...f, args: e.target.value }))}
          rows={2}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono"
          placeholder='["-y", "@modelcontextprotocol/server-github"]'
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Environment Variables <span className="text-gray-600">(JSON object)</span></label>
        <textarea
          value={form.env}
          onChange={e => setForm(f => ({ ...f, env: e.target.value }))}
          rows={3}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono"
          placeholder='{ "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }'
        />
        <p className="text-xs text-gray-600 mt-1">Values prefixed with <code className="text-gray-500">$</code> will be resolved from server environment variables.</p>
      </div>
      {argsError && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{argsError}</div>}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_enabled" checked={form.is_enabled} onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))} />
        <label htmlFor="is_enabled" className="text-sm text-gray-400">Enabled</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update Server' : 'Add Server'}
        </button>
      </div>
    </form>
  );
}

export default function McpPage() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const toast = useToast();

  async function load() {
    try {
      const [ws, data] = await Promise.all([api.get('/workspaces'), api.get('/mcp')]);
      setWorkspaceId(ws[0]?.id || '');
      setServers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(form) {
    setSaving(true);
    try {
      await api.post('/mcp', { ...form, workspace_id: workspaceId });
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
      await api.put(`/mcp/${editing.id}`, form);
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(server) {
    try {
      await api.put(`/mcp/${server.id}`, { is_enabled: !server.is_enabled });
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/mcp/${confirmDelete}`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function getArgs(server) {
    try {
      const args = typeof server.args_json === 'string' ? JSON.parse(server.args_json) : server.args_json;
      return Array.isArray(args) ? args : [];
    } catch { return []; }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">MCP Servers</h1>
          <p className="text-gray-400 mt-1">Model Context Protocol server configurations</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> Add Server
        </button>
      </div>

      {/* Info */}
      <div className="mb-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
        <Terminal size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-300">
          <strong>MCP Servers</strong> extend agent capabilities with tools, resources, and prompts via the{' '}
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer" className="underline hover:text-purple-200">Model Context Protocol</a>.
          Configure server connection details here and assign them to agents via Skills.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Server size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No MCP servers configured</p>
          <p className="text-sm text-gray-600 mb-4">Add GitHub, filesystem, search, and other MCP servers to expand what your agents can do.</p>
          <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add Server</button>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(server => {
            const args = getArgs(server);
            return (
              <div key={server.id} className={`bg-[#16181c] border rounded-xl p-5 transition-colors group ${server.is_enabled ? 'border-[#2a2d35] hover:border-[#3a3d45]' : 'border-[#1e2026] opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${server.is_enabled ? 'bg-purple-600/20' : 'bg-gray-600/20'}`}>
                      <Server size={16} className={server.is_enabled ? 'text-purple-400' : 'text-gray-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{server.name}</h3>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#2a2d35] text-gray-400">{server.transport}</span>
                        {server.is_enabled
                          ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">enabled</span>
                          : <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-500">disabled</span>}
                      </div>
                      {server.description && <p className="text-sm text-gray-400 mt-0.5">{server.description}</p>}
                      <code className="text-xs text-gray-500 font-mono mt-1 block">{server.command}{args.length > 0 ? ' ' + args.join(' ') : ''}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
                    <button onClick={() => toggleEnabled(server)} className={`p-1.5 rounded transition-colors ${server.is_enabled ? 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-600 hover:text-green-400 hover:bg-green-500/10'}`} title={server.is_enabled ? 'Disable' : 'Enable'}>
                      {server.is_enabled ? <PowerOff size={13} /> : <Power size={13} />}
                    </button>
                    <button onClick={() => setEditing(server)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmDelete(server.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add MCP Server" size="lg">
        <McpForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} saving={saving} />
      </Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit MCP Server" size="lg">
        {editing && <McpForm initial={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} saving={saving} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Remove MCP Server"
        message="Are you sure you want to remove this MCP server configuration?"
        confirmLabel="Remove"
      />
    </div>
  );
}
