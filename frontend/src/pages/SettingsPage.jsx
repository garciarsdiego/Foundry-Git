import React, { useState, useEffect } from 'react';
import { Plus, Github, Settings, Loader, Trash2, Pencil, Save, Users, Webhook, UserPlus, Eye, EyeOff, Shield } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

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

const GITHUB_EVENTS = ['push', 'pull_request', 'issues', 'release', 'workflow_run', 'create', 'delete'];

function WebhookForm({ initial = {}, flows = [], projects = [], onSubmit, onCancel, workspaceId }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    flow_id: initial.flow_id || '',
    project_id: initial.project_id || '',
    secret: '',
    events: initial.events_json ? JSON.parse(initial.events_json) : ['push'],
    is_enabled: initial.is_enabled !== undefined ? !!initial.is_enabled : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleEvent(evt) {
    setForm(f => ({
      ...f,
      events: f.events.includes(evt) ? f.events.filter(e => e !== evt) : [...f.events, evt],
    }));
  }

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
        <label className="block text-sm text-gray-400 mb-1">Name *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Deploy on push" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Trigger Flow</label>
        <select value={form.flow_id} onChange={e => setForm(f => ({ ...f, flow_id: e.target.value }))} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">— No flow —</option>
          {flows.map(fl => <option key={fl.id} value={fl.id}>{fl.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Project Context</label>
        <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">— No project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">GitHub Events</label>
        <div className="flex flex-wrap gap-2">
          {GITHUB_EVENTS.map(evt => (
            <button
              key={evt}
              type="button"
              onClick={() => toggleEvent(evt)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                form.events.includes(evt)
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                  : 'bg-transparent text-gray-500 border-[#2a2d35] hover:border-gray-500'
              }`}
            >
              {evt}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Webhook Secret <span className="text-gray-600">(optional)</span></label>
        <input
          type="password"
          value={form.secret}
          onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
          placeholder={initial.id ? 'Leave blank to keep existing secret' : 'HMAC-SHA256 signing secret'}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="wh_enabled" checked={form.is_enabled} onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))} />
        <label htmlFor="wh_enabled" className="text-sm text-gray-400">Enabled</label>
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

function UserForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    username: initial.username || '',
    email: initial.email || '',
    password: '',
    role: initial.role || 'member',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim()) return setError('Username is required');
    if (!initial.id && !form.password) return setError('Password is required for new users');
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
        <label className="block text-sm text-gray-400 mb-1">Username *</label>
        <input
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          disabled={!!initial.id}
          placeholder="username"
          autoFocus
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email <span className="text-gray-600">(optional)</span></label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Password {initial.id && <span className="text-gray-600">(leave blank to keep current)</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder={initial.id ? 'New password (optional)' : 'Set a strong password'}
            className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 pr-9 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Role</label>
        <select
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="admin">Admin — full access</option>
          <option value="member">Member — read/write</option>
          <option value="viewer">Viewer — read only</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : initial.id ? 'Update' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

const ROLE_COLORS = {
  admin: 'bg-purple-500/20 text-purple-400',
  member: 'bg-blue-500/20 text-blue-400',
  viewer: 'bg-gray-500/20 text-gray-400',
};


export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // GitHub connection modal state
  const [ghModal, setGhModal] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Workspace editing
  const [editingWsName, setEditingWsName] = useState(false);
  const [wsName, setWsName] = useState('');
  const [savingWs, setSavingWs] = useState(false);

  // Webhook modal state
  const [whModal, setWhModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [confirmDeleteWh, setConfirmDeleteWh] = useState(null);

  // User modal state
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  async function load() {
    try {
      const [data, flowsData, projectsData] = await Promise.all([
        api.get('/settings'),
        api.get('/flows'),
        api.get('/projects'),
      ]);
      setSettings(data);
      setWsName(data.workspace?.name || '');
      setFlows(flowsData);
      setProjects(projectsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await api.get('/auth/users');
      setUsers(data);
    } catch (e) {
      // May fail if auth is disabled or user is not admin
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => { load(); loadUsers(); }, []);

  async function handleSaveWsName() {
    if (!wsName.trim()) return;
    setSavingWs(true);
    try {
      await api.put('/settings/workspace', { name: wsName.trim() });
      setEditingWsName(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingWs(false);
    }
  }

  // GitHub connection handlers
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
  async function confirmDeleteConn() {
    await api.delete(`/github/connections/${confirmDelete}`);
    load();
  }

  // Webhook handlers
  async function handleCreateWebhook(data) {
    await api.post('/webhooks', data);
    setWhModal(false);
    load();
  }
  async function handleEditWebhook(data) {
    await api.put(`/webhooks/${editingWebhook.id}`, data);
    setEditingWebhook(null);
    load();
  }
  async function confirmDeleteWebhook() {
    await api.delete(`/webhooks/${confirmDeleteWh}`);
    setConfirmDeleteWh(null);
    load();
  }

  // User handlers
  async function handleCreateUser(data) {
    await api.post('/auth/users', data);
    setUserModal(false);
    loadUsers();
  }
  async function handleEditUser(data) {
    await api.put(`/auth/users/${editingUser.id}`, data);
    setEditingUser(null);
    loadUsers();
  }
  async function confirmDeleteUserFn() {
    await api.delete(`/auth/users/${confirmDeleteUser}`);
    setConfirmDeleteUser(null);
    loadUsers();
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
              {editingWsName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveWsName()}
                    autoFocus
                    className="flex-1 bg-[#0d0d0f] border border-blue-500 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                  />
                  <button onClick={handleSaveWsName} disabled={savingWs} className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors">
                    {savingWs ? <Loader size={12} className="animate-spin" /> : <Save size={13} />}
                  </button>
                  <button onClick={() => { setEditingWsName(false); setWsName(settings.workspace.name); }} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div className="text-sm text-white">{settings.workspace.name}</div>
                  <button onClick={() => setEditingWsName(true)} className="p-1 text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Slug</div>
              <div className="text-sm text-white font-mono">{settings.workspace.slug}</div>
            </div>
          </div>
        </div>
      )}

      {/* Users management */}
      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Users size={16} /> Users</h2>
          <button onClick={() => setUserModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
            <UserPlus size={13} /> Add User
          </button>
        </div>
        {loadingUsers ? (
          <div className="flex items-center py-4 text-gray-500 text-sm gap-2">
            <Loader size={14} className="animate-spin" /> Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No users yet — authentication may be disabled.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {(user.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {user.username}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.member}`}>
                        {user.role}
                      </span>
                      {!user.is_active && <span className="text-xs text-gray-600">(inactive)</span>}
                    </div>
                    {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingUser(user)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                  {user.username !== 'admin' && (
                    <button onClick={() => setConfirmDeleteUser(user.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                  <button onClick={() => setConfirmDelete(conn.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><Webhook size={16} /> GitHub Webhooks</h2>
          <button onClick={() => setWhModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">
            <Plus size={13} /> Add Webhook
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Point GitHub repository webhooks to <code className="font-mono text-gray-400 bg-[#0d0d0f] px-1.5 py-0.5 rounded">/api/webhooks/receive/&lt;id&gt;</code> where <code className="font-mono text-gray-400 bg-[#0d0d0f] px-1.5 py-0.5 rounded">&lt;id&gt;</code> is the webhook config ID shown below.
        </p>

        {!settings?.webhooks?.length ? (
          <div className="text-center py-8 text-gray-500">
            <Webhook size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No webhooks configured yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings.webhooks.map(wh => {
              const events = JSON.parse(wh.events_json || '[]');
              return (
                <div key={wh.id} className="flex items-start justify-between p-4 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{wh.name}</span>
                      {wh.is_enabled ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">enabled</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">disabled</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mb-1 truncate">
                      /api/webhooks/receive/{wh.id}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {events.map(e => (
                        <span key={e} className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/80 font-mono">{e}</span>
                      ))}
                      {wh.flow_name && (
                        <span className="text-xs text-gray-500">→ {wh.flow_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-3 flex-shrink-0">
                    <button onClick={() => setEditingWebhook(wh)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmDeleteWh(wh.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
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

      {/* GitHub connection modals */}
      <Modal isOpen={ghModal} onClose={() => setGhModal(false)} title="Add GitHub Connection">
        <GitHubConnectionForm workspaceId={settings?.workspace?.id} onSubmit={handleCreateConn} onCancel={() => setGhModal(false)} />
      </Modal>
      <Modal isOpen={!!editingConn} onClose={() => setEditingConn(null)} title="Edit GitHub Connection">
        {editingConn && <GitHubConnectionForm initial={editingConn} workspaceId={settings?.workspace?.id} onSubmit={handleEditConn} onCancel={() => setEditingConn(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteConn}
        title="Delete Connection"
        message="Are you sure you want to delete this GitHub connection?"
        confirmLabel="Delete"
      />

      {/* Webhook modals */}
      <Modal isOpen={whModal} onClose={() => setWhModal(false)} title="Add Webhook">
        {settings?.workspace && (
          <WebhookForm
            workspaceId={settings.workspace.id}
            flows={flows}
            projects={projects}
            onSubmit={handleCreateWebhook}
            onCancel={() => setWhModal(false)}
          />
        )}
      </Modal>
      <Modal isOpen={!!editingWebhook} onClose={() => setEditingWebhook(null)} title="Edit Webhook">
        {editingWebhook && settings?.workspace && (
          <WebhookForm
            initial={editingWebhook}
            workspaceId={settings.workspace.id}
            flows={flows}
            projects={projects}
            onSubmit={handleEditWebhook}
            onCancel={() => setEditingWebhook(null)}
          />
        )}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDeleteWh}
        onClose={() => setConfirmDeleteWh(null)}
        onConfirm={confirmDeleteWebhook}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook configuration?"
        confirmLabel="Delete"
      />

      {/* User modals */}
      <Modal isOpen={userModal} onClose={() => setUserModal(false)} title="Create User">
        <UserForm onSubmit={handleCreateUser} onCancel={() => setUserModal(false)} />
      </Modal>
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && <UserForm initial={editingUser} onSubmit={handleEditUser} onCancel={() => setEditingUser(null)} />}
      </Modal>
      <ConfirmModal
        isOpen={!!confirmDeleteUser}
        onClose={() => setConfirmDeleteUser(null)}
        onConfirm={confirmDeleteUserFn}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
