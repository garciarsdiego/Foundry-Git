import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Workflow, Play, Loader, Trash2, Edit2, CheckCircle2, Archive } from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';

const STATUS_STYLES = {
  draft: 'bg-gray-500/20 text-gray-400',
  active: 'bg-green-500/20 text-green-400',
  archived: 'bg-yellow-500/20 text-yellow-400',
};

function NewFlowModal({ workspaceId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    try {
      const flow = await api.post('/flows', { workspace_id: workspaceId, name, description });
      onCreated(flow);
      onClose();
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
        <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Flow name..." className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What does this flow do?" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Flow'}
        </button>
      </div>
    </form>
  );
}

export default function FlowsPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  async function load() {
    try {
      const ws = await api.get('/workspaces');
      if (ws?.length) {
        setWorkspace(ws[0]);
        const data = await api.get(`/flows?workspace_id=${ws[0].id}`);
        setFlows(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteFlow(flowId, e) {
    e.stopPropagation();
    if (!confirm('Delete this flow?')) return;
    try {
      await api.delete(`/flows/${flowId}`);
      setFlows(prev => prev.filter(f => f.id !== flowId));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading flows...
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Flows</h1>
          <p className="text-gray-400 mt-1">Multi-agent workflow pipelines</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          New Flow
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Workflow size={28} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No flows yet</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Create a flow to chain multiple agents together in sequence. Each step runs an agent on a task card.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
          >
            Create your first flow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {flows.map(flow => (
            <div
              key={flow.id}
              onClick={() => navigate(`/flows/${flow.id}`)}
              className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-blue-500/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Workflow size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">{flow.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[flow.status] || STATUS_STYLES.draft}`}>
                        {flow.status}
                      </span>
                    </div>
                    {flow.description && (
                      <p className="text-sm text-gray-400 truncate">{flow.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">{new Date(flow.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={(e) => deleteFlow(flow.id, e)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewModal && workspace && (
        <Modal isOpen onClose={() => setShowNewModal(false)} title="New Flow">
          <NewFlowModal
            workspaceId={workspace.id}
            onClose={() => setShowNewModal(false)}
            onCreated={(flow) => {
              navigate(`/flows/${flow.id}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
