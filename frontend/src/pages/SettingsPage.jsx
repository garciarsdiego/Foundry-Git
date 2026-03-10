import React, { useState, useEffect } from 'react';
import { Plus, Github, Settings, Loader, Trash2, Pencil, Check } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

function GitHubConnectionForm({ initial = {}, onSubmit, onCancel, workspaceId }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    access_token_env_var: initial.access_token_env_var || '',
    installation_id: initial.installation_id || '',
    app_id: initial.app_id || '',
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
      await onSubmit({ ...form, workspace_id: workspaceId });
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
        <label className="block text-sm text-gray-400 mb-1">Connection Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="My GitHub" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Access Token Env Var</label>
        <input value={form.access_token_env_var} onChange={set('access_token_env_var')} placeholder="GITHUB_TOKEN" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
        <p className="text-xs text-gray-600 mt-1">Environment variable containing your GitHub personal access token</p>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">GitHub App ID <span className="text-gray-600">(optional)</span></label>
        <input value={form.app_id} onChange={set('app_id')} placeholder="123456" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Installation ID <span className="text-gray-600">(optional)</span></label>
        <input value={form.installation_id} onChange={set('installation_id')} placeholder="78901234" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_default_gh" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
        <label htmlFor="is_default_gh" className="text-sm text-gray-400">Set as default connection</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ghModal, setGhModal] = useState(false);
  const [editingConn, setEditingConn] = useState(null);

  async function load() {
    try {
      const data = await api.get('/settings');
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateConn(data) {
    await api.post('/github/connections', data);
    setGhModal(false);
    load();
  }

  async function handleEditConn(data) {
    await api.put(`/github/connections/${editingConn.id}`, data);
    setEditingConn(null);
    load();
  }

  async function handleDeleteConn(id) {
    if (!confirm('Delete this GitHub connection?')) return;
    await api.delete(`/github/connections/${id}`);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading settings...
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Workspace configuration and integrations</p>
      </div>

      {/* Workspace info */}
      {settings?.workspace && (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Settings size={16} /> Workspace</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Name</div>
              <div className="text-sm text-white">{settings.workspace.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Slug</div>
              <div className="text-sm text-white font-mono">{settings.workspace.slug}</div>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Connections */}
      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Github size={16} /> GitHub Connections</h2>
          <button onClick={() => setGhModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
            <Plus size={13} /> Add Connection
          </button>
        </div>

        {settings?.github_connections?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Github size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No GitHub connections yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settings?.github_connections?.map(conn => (
              <div key={conn.id} className="flex items-center justify-between p-4 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                    <Github size={14} className="text-gray-300" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {conn.name}
                      {conn.is_default ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">default</span> : null}
                    </div>
                    {conn.access_token_env_var && (
                      <div className="text-xs text-gray-500 font-mono">{conn.access_token_env_var}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingConn(conn)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                  <button onClick={() => handleDeleteConn(conn.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Providers</h3>
          <div className="text-2xl font-bold text-white">{settings?.providers?.length || 0}</div>
          <div className="text-xs text-gray-500">configured</div>
        </div>
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Runtimes</h3>
          <div className="text-2xl font-bold text-white">{settings?.runtimes?.length || 0}</div>
          <div className="text-xs text-gray-500">configured</div>
        </div>
      </div>

      <Modal isOpen={ghModal} onClose={() => setGhModal(false)} title="Add GitHub Connection">
        <GitHubConnectionForm workspaceId={settings?.workspace?.id} onSubmit={handleCreateConn} onCancel={() => setGhModal(false)} />
      </Modal>
      <Modal isOpen={!!editingConn} onClose={() => setEditingConn(null)} title="Edit GitHub Connection">
        {editingConn && <GitHubConnectionForm initial={editingConn} workspaceId={settings?.workspace?.id} onSubmit={handleEditConn} onCancel={() => setEditingConn(null)} />}
      </Modal>
    </div>
  );
}
