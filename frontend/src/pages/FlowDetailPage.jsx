import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Workflow, Plus, Trash2, ArrowLeft, Play, Loader, Bot,
  GripVertical, ChevronRight, Save, Check, X, GitBranch, Zap
} from 'lucide-react';
import api from '../components/api.js';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STEP_TYPE_ICONS = {
  agent: Bot,
  condition: GitBranch,
  parallel: Zap,
};

const STEP_TYPE_LABELS = {
  agent: 'Agent Step',
  condition: 'Condition',
  parallel: 'Parallel',
};

function AddStepModal({ flowId, agents, onClose, onAdded }) {
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [stepType, setStepType] = useState('agent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setSaving(true);
    try {
      const step = await api.post(`/flows/${flowId}/steps`, {
        name,
        agent_id: agentId || null,
        step_type: stepType,
      });
      onAdded(step);
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
        <label className="block text-sm text-gray-400 mb-1">Step Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g., Write tests" className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Step Type</label>
        <select value={stepType} onChange={e => setStepType(e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="agent">Agent — Execute with an AI agent</option>
          <option value="condition">Condition — Branch on result</option>
          <option value="parallel">Parallel — Run concurrently</option>
        </select>
      </div>
      {stepType !== 'condition' && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Agent</label>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">— No agent assigned —</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.execution_mode})</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
          {saving ? 'Adding...' : 'Add Step'}
        </button>
      </div>
    </form>
  );
}

function RunFlowModal({ flow, cards, onClose, onRun }) {
  const [cardId, setCardId] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setRunning(true);
    try {
      const flowRun = await api.post(`/flows/${flow.id}/run`, {
        card_id: cardId || null,
        project_id: flow.project_id || null,
      });
      onRun(flowRun);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
      <p className="text-sm text-gray-400">
        Run all steps of <strong className="text-white">{flow.name}</strong> in sequence. Optionally associate a card for context.
      </p>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Card (optional)</label>
        <select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">— No card —</option>
          {cards.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={running} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50">
          <Play size={14} />
          {running ? 'Starting...' : 'Run Flow'}
        </button>
      </div>
    </form>
  );
}

export default function FlowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [runs, setRuns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [flowData, agentsData, runsData] = await Promise.all([
        api.get(`/flows/${id}`),
        api.get('/agents'),
        api.get(`/flows/${id}/runs`),
      ]);
      setFlow(flowData);
      setSteps(flowData.steps || []);
      setAgents(agentsData);
      setRuns(runsData);
      setNameValue(flowData.name);

      // Load cards if flow has a project
      if (flowData.project_id) {
        const cardsData = await api.get(`/cards?project_id=${flowData.project_id}`);
        setCards(cardsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function deleteStep(stepId) {
    if (!confirm('Delete this step?')) return;
    try {
      await api.delete(`/flows/${id}/steps/${stepId}`);
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (err) {
      console.error(err);
    }
  }

  async function saveName() {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      const updated = await api.put(`/flows/${id}`, { name: nameValue });
      setFlow(updated);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status) {
    try {
      const updated = await api.put(`/flows/${id}`, { status });
      setFlow(updated);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading flow...
    </div>
  );

  if (!flow) return (
    <div className="p-6 text-gray-400">Flow not found. <Link to="/flows" className="text-blue-400 hover:underline">Back to flows</Link></div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/flows" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
                className="flex-1 bg-[#0d0d0f] border border-blue-500 rounded-lg px-3 py-1.5 text-white text-xl font-bold focus:outline-none"
              />
              <button onClick={saveName} disabled={saving} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg">
                <Check size={16} />
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:bg-white/5 rounded-lg">
                <X size={16} />
              </button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold text-white hover:text-blue-300 cursor-pointer transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to edit"
            >
              {flow.name}
            </h1>
          )}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            flow.status === 'active' ? 'bg-green-500/20 text-green-400' :
            flow.status === 'archived' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {flow.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {flow.status !== 'active' && (
            <button
              onClick={() => updateStatus('active')}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-green-400 border border-[#2a2d35] hover:border-green-500/30 rounded-lg transition-colors"
            >
              Activate
            </button>
          )}
          <button
            onClick={() => setShowRunModal(true)}
            disabled={steps.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-sm transition-colors"
          >
            <Play size={14} />
            Run Flow
          </button>
        </div>
      </div>

      {flow.description && (
        <p className="text-gray-400 text-sm mb-6">{flow.description}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Steps ({steps.length})</h2>
            <button
              onClick={() => setShowAddStep(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/60 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <div className="bg-[#16181c] border-2 border-dashed border-[#2a2d35] rounded-xl p-8 text-center">
              <Workflow size={28} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">No steps yet. Add your first agent step.</p>
              <button
                onClick={() => setShowAddStep(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
              >
                Add First Step
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const Icon = STEP_TYPE_ICONS[step.step_type] || Bot;
                return (
                  <React.Fragment key={step.id}>
                    <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4 group hover:border-blue-500/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={15} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">Step {idx + 1}</span>
                            <span className="text-xs text-gray-600">·</span>
                            <span className="text-xs text-gray-500">{STEP_TYPE_LABELS[step.step_type]}</span>
                          </div>
                          <p className="font-medium text-white text-sm">{step.name}</p>
                          {step.agent_name && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              <Bot size={10} className="inline mr-1" />
                              {step.agent_name}
                            </p>
                          )}
                          {!step.agent_id && step.step_type !== 'condition' && (
                            <p className="text-xs text-yellow-500/70 mt-0.5">No agent assigned</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="flex justify-center">
                        <ChevronRight size={16} className="text-gray-600 rotate-90" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Runs sidebar */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Recent Runs</h2>
          {runs.length === 0 ? (
            <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4 text-center text-gray-500 text-sm">
              No runs yet
            </div>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 10).map(run => (
                <div key={run.id} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={run.status} />
                    <span className="text-xs text-gray-600">{run.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(run.created_at).toLocaleString()}</p>
                  {run.error_message && (
                    <p className="text-xs text-red-400 mt-1 truncate">{run.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddStep && (
        <Modal isOpen onClose={() => setShowAddStep(false)} title="Add Step">
          <AddStepModal
            flowId={id}
            agents={agents}
            onClose={() => setShowAddStep(false)}
            onAdded={(step) => {
              setSteps(prev => [...prev, step]);
            }}
          />
        </Modal>
      )}

      {showRunModal && (
        <Modal isOpen onClose={() => setShowRunModal(false)} title="Run Flow">
          <RunFlowModal
            flow={flow}
            cards={cards}
            onClose={() => setShowRunModal(false)}
            onRun={(flowRun) => {
              setRuns(prev => [flowRun, ...prev]);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
