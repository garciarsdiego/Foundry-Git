import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Bot, Flag, Tag, Loader, CheckCircle } from 'lucide-react';
import api from '../components/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';

export default function TaskDetailPage() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [agents, setAgents] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runModal, setRunModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [cardData, agentData, runsData] = await Promise.all([
        api.get(`/cards/${taskId}`),
        api.get('/agents'),
        api.get(`/runs`),
      ]);
      setCard(cardData);
      setEditForm({
        title: cardData.title,
        description: cardData.description || '',
        priority: cardData.priority,
        assignee_agent_id: cardData.assignee_agent_id || '',
      });
      setAgents(agentData);
      setRuns(runsData.filter(r => r.card_id === taskId));
      if (cardData.assignee_agent_id) setSelectedAgent(cardData.assignee_agent_id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [taskId]);

  async function handleCreateRun() {
    if (!selectedAgent) return;
    setRunning(true);
    try {
      const run = await api.post(`/cards/${taskId}/run`, { agent_id: selectedAgent });
      setRunModal(false);
      navigate(`/runs/${run.id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/cards/${taskId}`, editForm);
      setEditing(false);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading...
    </div>
  );

  if (!card) return (
    <div className="p-6 text-center text-gray-400">
      <p>Card not found.</p>
      <Link to={`/projects/${projectId}/board`} className="text-blue-400 hover:underline">Back to board</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to={`/projects/${projectId}/board`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Board
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Assignee Agent</label>
                  <select
                    value={editForm.assignee_agent_id}
                    onChange={e => setEditForm(f => ({ ...f, assignee_agent_id: e.target.value }))}
                    className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-xl font-bold text-white flex-1">{card.title}</h1>
                  <button onClick={() => setEditing(true)} className="ml-3 text-xs text-gray-500 hover:text-white border border-[#2a2d35] hover:border-[#3a3d45] px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                </div>
                {card.description ? (
                  <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
                ) : (
                  <p className="text-gray-600 text-sm italic">No description</p>
                )}
              </>
            )}
          </div>

          {/* Runs history */}
          <div className="mt-6 bg-[#16181c] border border-[#2a2d35] rounded-xl">
            <div className="px-6 py-4 border-b border-[#2a2d35]">
              <h2 className="font-semibold text-white text-sm">Run History</h2>
            </div>
            {runs.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">No runs yet for this card.</div>
            ) : (
              <div className="divide-y divide-[#2a2d35]">
                {runs.map(run => (
                  <Link key={run.id} to={`/runs/${run.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-white/3 transition-colors">
                    <StatusBadge status={run.status} showDot />
                    <div className="flex-1">
                      <div className="text-sm text-gray-300">{run.agent_name || 'No agent'}</div>
                      <div className="text-xs text-gray-500">{new Date(run.created_at).toLocaleString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Details</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <StatusBadge status={card.status} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Priority</div>
                <StatusBadge status={card.priority} />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Assignee</div>
                <div className="text-sm text-gray-300">
                  {agents.find(a => a.id === card.assignee_agent_id)?.name || <span className="text-gray-600">Unassigned</span>}
                </div>
              </div>
              {card.github_issue_number && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">GitHub Issue</div>
                  <a href={card.github_issue_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                    #{card.github_issue_number}
                  </a>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setRunModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Play size={16} /> Create Run
          </button>
        </div>
      </div>

      {/* Run modal */}
      <Modal isOpen={runModal} onClose={() => setRunModal(false)} title="Create Run">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Select an agent to execute this task:</p>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select agent...</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.execution_mode})</option>)}
          </select>
          {agents.length === 0 && (
            <p className="text-sm text-yellow-400">No agents configured yet. <Link to="/agents" className="underline">Create one</Link></p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => setRunModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={handleCreateRun} disabled={!selectedAgent || running} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50">
              {running ? 'Creating...' : 'Start Run'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
