import React, { useState, useEffect } from 'react';
import { Plus, Users, Loader, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [membersModal, setMembersModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  async function load() {
    try {
      const [ws, teamsData, agentsData] = await Promise.all([
        api.get('/workspaces'),
        api.get('/teams'),
        api.get('/agents'),
      ]);
      setWorkspaceId(ws[0]?.id || '');
      setTeams(teamsData);
      setAgents(agentsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openTeamMembers(team) {
    const data = await api.get(`/teams/${team.id}`);
    setMembersModal(data);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/teams', { ...form, workspace_id: workspaceId });
      setCreateOpen(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this team?')) return;
    await api.delete(`/teams/${id}`);
    load();
  }

  async function addMember() {
    if (!selectedAgent || !membersModal) return;
    try {
      await api.post(`/teams/${membersModal.id}/members`, { agent_id: selectedAgent });
      const updated = await api.get(`/teams/${membersModal.id}`);
      setMembersModal(updated);
      setSelectedAgent('');
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeMember(agentId) {
    await api.delete(`/teams/${membersModal.id}/members/${agentId}`);
    const updated = await api.get(`/teams/${membersModal.id}`);
    setMembersModal(updated);
    load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">Organize agents into teams for collaborative tasks</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          <Plus size={16} /> New Team
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No teams yet</p>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Team</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-orange-600/20 flex items-center justify-center">
                  <Users size={16} className="text-orange-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openTeamMembers(team)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10" title="Manage members"><UserPlus size={13} /></button>
                  <button onClick={() => handleDelete(team.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{team.name}</h3>
              {team.description && <p className="text-sm text-gray-400 line-clamp-2">{team.description}</p>}
              <button
                onClick={() => openTeamMembers(team)}
                className="mt-4 w-full text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Manage Members
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Team">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Frontend Team" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Members modal */}
      <Modal isOpen={!!membersModal} onClose={() => setMembersModal(null)} title={`${membersModal?.name} — Members`} size="lg">
        {membersModal && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                className="flex-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Add agent...</option>
                {agents
                  .filter(a => !membersModal.members?.some(m => m.agent_id === a.id))
                  .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={addMember} disabled={!selectedAgent} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">Add</button>
            </div>
            <div className="divide-y divide-[#2a2d35] rounded-lg border border-[#2a2d35] overflow-hidden">
              {membersModal.members?.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">No members yet</div>
              ) : (
                membersModal.members?.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-white">{m.agent_name}</div>
                      <div className="text-xs text-gray-500">{m.role} · {m.execution_mode}</div>
                    </div>
                    <button onClick={() => removeMember(m.agent_id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><UserMinus size={14} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
