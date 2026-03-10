import React, { useState, useEffect } from 'react';
import { Plus, Users, Loader, Pencil, Trash2, UserPlus, UserMinus, ChevronRight, Network } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

const ROLES = ['member', 'lead', 'reviewer', 'observer'];

function TeamCard({ team, agents, allTeams, onManageMembers, onDelete, onEdit }) {
  const subTeams = allTeams.filter(t => t.parent_team_id === team.id);
  return (
    <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-orange-600/20 flex items-center justify-center">
          <Users size={16} className="text-orange-400" />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(team)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10" title="Edit team"><Pencil size={13} /></button>
          <button onClick={() => onManageMembers(team)} className="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10" title="Manage members"><UserPlus size={13} /></button>
          <button onClick={() => onDelete(team.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
        </div>
      </div>
      <h3 className="font-semibold text-white mb-1">{team.name}</h3>
      {team.description && <p className="text-sm text-gray-400 line-clamp-2 mb-2">{team.description}</p>}

      {/* Hierarchy info */}
      <div className="space-y-1 mb-3">
        {team.parent_team_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ChevronRight size={11} className="text-gray-600" />
            <span>Reports to: <span className="text-gray-400">{team.parent_team_name}</span></span>
          </div>
        )}
        {team.manager_agent_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Network size={11} className="text-gray-600" />
            <span>Manager: <span className="text-gray-400">{team.manager_agent_name}</span></span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto pt-3 border-t border-[#2a2d35]">
        <span>{team.member_count || 0} member{team.member_count !== 1 ? 's' : ''}</span>
        {subTeams.length > 0 && <span>· {subTeams.length} sub-team{subTeams.length !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [membersModal, setMembersModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', parent_team_id: '', manager_agent_id: '' });
  const [saving, setSaving] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | hierarchy
  const toast = useToast();

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
      await api.post('/teams', {
        ...form,
        workspace_id: workspaceId,
        parent_team_id: form.parent_team_id || null,
        manager_agent_id: form.manager_agent_id || null,
      });
      setCreateOpen(false);
      setForm({ name: '', description: '', parent_team_id: '', manager_agent_id: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editingTeam) return;
    setSaving(true);
    try {
      await api.put(`/teams/${editingTeam.id}`, {
        ...form,
        parent_team_id: form.parent_team_id || null,
        manager_agent_id: form.manager_agent_id || null,
      });
      setEditingTeam(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function openEditTeam(team) {
    setForm({
      name: team.name,
      description: team.description || '',
      parent_team_id: team.parent_team_id || '',
      manager_agent_id: team.manager_agent_id || '',
    });
    setEditingTeam(team);
  }

  async function confirmDeleteTeam() {
    try {
      await api.delete(`/teams/${confirmDelete}`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function addMember() {
    if (!selectedAgent || !membersModal) return;
    try {
      await api.post(`/teams/${membersModal.id}/members`, {
        agent_id: selectedAgent,
        role: selectedRole,
        title: selectedTitle || null,
      });
      const updated = await api.get(`/teams/${membersModal.id}`);
      setMembersModal(updated);
      setSelectedAgent('');
      setSelectedRole('member');
      setSelectedTitle('');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function removeMember(agentId) {
    await api.delete(`/teams/${membersModal.id}/members/${agentId}`);
    const updated = await api.get(`/teams/${membersModal.id}`);
    setMembersModal(updated);
    load();
  }

  // Build hierarchy tree for the org-chart view
  const rootTeams = teams.filter(t => !t.parent_team_id);

  function OrgNode({ team, depth = 0 }) {
    const children = teams.filter(t => t.parent_team_id === team.id);
    return (
      <div className={depth > 0 ? 'ml-8 mt-2' : 'mt-2'}>
        <div className="flex items-center gap-2 bg-[#16181c] border border-[#2a2d35] rounded-lg px-4 py-3 hover:border-[#3a3d45] transition-colors">
          {depth > 0 && <div className="w-4 h-px bg-[#3a3d45] flex-shrink-0" />}
          <div className="w-7 h-7 rounded-md bg-orange-600/20 flex items-center justify-center flex-shrink-0">
            <Users size={13} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">{team.name}</div>
            {team.manager_agent_name && (
              <div className="text-xs text-gray-500">Manager: {team.manager_agent_name}</div>
            )}
          </div>
          <div className="text-xs text-gray-600">{team.member_count} members</div>
          <button onClick={() => openTeamMembers(team)} className="p-1 text-gray-600 hover:text-blue-400"><UserPlus size={13} /></button>
        </div>
        {children.map(child => <OrgNode key={child.id} team={child} depth={depth + 1} />)}
      </div>
    );
  }

  function TeamForm({ onSubmit, submitLabel }) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Frontend Team" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Parent Team <span className="text-gray-600">(optional — for org hierarchy)</span></label>
          <select value={form.parent_team_id} onChange={e => setForm(f => ({ ...f, parent_team_id: e.target.value }))} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">No parent (root team)</option>
            {teams.filter(t => !editingTeam || t.id !== editingTeam.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Manager Agent <span className="text-gray-600">(optional)</span></label>
          <select value={form.manager_agent_id} onChange={e => setForm(f => ({ ...f, manager_agent_id: e.target.value }))} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">No manager</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => { setCreateOpen(false); setEditingTeam(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">Organize agents into hierarchic teams</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#2a2d35] rounded-lg overflow-hidden text-xs">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#2a2d35] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Grid</button>
            <button onClick={() => setViewMode('hierarchy')} className={`px-3 py-1.5 transition-colors ${viewMode === 'hierarchy' ? 'bg-[#2a2d35] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Org Chart</button>
          </div>
          <button onClick={() => { setForm({ name: '', description: '', parent_team_id: '', manager_agent_id: '' }); setCreateOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
            <Plus size={16} /> New Team
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No teams yet</p>
          <p className="text-sm text-gray-600 mb-4">Create teams to organize your agents into hierarchies with managers and reporting lines.</p>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Create Team</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              agents={agents}
              allTeams={teams}
              onManageMembers={openTeamMembers}
              onDelete={id => setConfirmDelete(id)}
              onEdit={openEditTeam}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <Network size={16} />
            <span>Org Chart — {teams.length} team{teams.length !== 1 ? 's' : ''}</span>
          </div>
          {rootTeams.length === 0 ? (
            <p className="text-gray-500 text-sm">No root teams found.</p>
          ) : (
            rootTeams.map(team => <OrgNode key={team.id} team={team} depth={0} />)
          )}
        </div>
      )}

      {/* Create team modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Team">
        <TeamForm onSubmit={handleCreate} submitLabel="Create Team" />
      </Modal>

      {/* Edit team modal */}
      <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Edit Team">
        <TeamForm onSubmit={handleEdit} submitLabel="Save Changes" />
      </Modal>

      {/* Members modal */}
      <Modal isOpen={!!membersModal} onClose={() => setMembersModal(null)} title={`${membersModal?.name} — Members`} size="lg">
        {membersModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="col-span-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">Add agent...</option>
                {agents.filter(a => !membersModal.members?.some(m => m.agent_id === a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={selectedTitle} onChange={e => setSelectedTitle(e.target.value)} placeholder="Title (e.g. CTO)" className="bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={addMember} disabled={!selectedAgent} className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">Add Member</button>
            <div className="divide-y divide-[#2a2d35] rounded-lg border border-[#2a2d35] overflow-hidden">
              {membersModal.members?.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">No members yet</div>
              ) : (
                membersModal.members?.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-white">{m.agent_name}</div>
                      <div className="text-xs text-gray-500">
                        {m.title ? `${m.title} · ` : ''}{m.role} · {m.execution_mode}
                      </div>
                    </div>
                    <button onClick={() => removeMember(m.agent_id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><UserMinus size={14} /></button>
                  </div>
                ))
              )}
            </div>
            {membersModal.sub_teams?.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Sub-teams</div>
                <div className="flex flex-wrap gap-2">
                  {membersModal.sub_teams.map(st => (
                    <span key={st.id} className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">{st.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteTeam}
        title="Delete Team"
        message="Are you sure you want to delete this team? Sub-teams will become root teams."
        confirmLabel="Delete Team"
      />
    </div>
  );
}
