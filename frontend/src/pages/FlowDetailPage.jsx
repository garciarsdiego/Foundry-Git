import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Workflow, Plus, Trash2, ArrowLeft, Play, Loader, Bot,
  GripVertical, ChevronRight, Save, Check, X, GitBranch, Zap,
  List, LayoutTemplate
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

/**
 * Drag-and-drop step list. Uses the HTML5 drag-and-drop API.
 * Calls onReorder(newOrderedSteps) when a drop completes.
 */
function DraggableStepList({ steps, onReorder, onDelete }) {
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function handleDragStart(e, idx) {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(idx);
  }

  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...steps];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(idx, 0, moved);
    dragIndex.current = null;
    setDragOverIndex(null);
    onReorder(reordered);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const Icon = STEP_TYPE_ICONS[step.step_type] || Bot;
        const isDragOver = dragOverIndex === idx;
        return (
          <React.Fragment key={step.id}>
            <div
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`bg-[#16181c] border rounded-xl p-4 group hover:border-blue-500/30 transition-colors cursor-grab active:cursor-grabbing ${
                isDragOver ? 'border-blue-500/60 bg-blue-500/5' : 'border-[#2a2d35]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" title="Drag to reorder" />
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-blue-400" />
                  </div>
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
                  onClick={() => onDelete(step.id)}
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
  );
}

/**
 * Visual node-based canvas editor for flow steps.
 * - Each step is a draggable card node positioned on a scrollable canvas.
 * - SVG edges connect nodes sequentially.
 * - Node positions are saved in the flow's canvas_layout_json field.
 */
const NODE_W = 200;
const NODE_H = 72;
const GRID = 20;
const CANVAS_W = 1600;
const CANVAS_H = 900;

const STEP_COLORS = {
  agent: { bg: 'bg-blue-600/20', border: 'border-blue-500/40', icon: 'text-blue-400', header: '#1e3a5f' },
  condition: { bg: 'bg-yellow-600/20', border: 'border-yellow-500/40', icon: 'text-yellow-400', header: '#3d3000' },
  parallel: { bg: 'bg-purple-600/20', border: 'border-purple-500/40', icon: 'text-purple-400', header: '#2d1a5f' },
};

function snap(v) { return Math.round(v / GRID) * GRID; }

function FlowCanvas({ steps, flowId, canvasLayout, onLayoutChange, onDelete, onAddStep }) {
  // Node positions: { [stepId]: {x, y} }
  const [positions, setPositions] = useState(() => {
    const layout = canvasLayout || {};
    // Auto-layout steps that don't have a saved position
    return steps.reduce((acc, step, i) => {
      acc[step.id] = layout[step.id] || { x: 80 + i * (NODE_W + 60), y: 200 };
      return acc;
    }, {});
  });
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const saveTimer = useRef(null);

  // Stable step-id key to avoid recomputing on every render
  const stepIdsKey = steps.map(s => s.id).join(',');

  // Re-initialize positions when steps change
  useEffect(() => {
    const layout = canvasLayout || {};
    setPositions(steps.reduce((acc, step, i) => {
      acc[step.id] = layout[step.id] || { x: 80 + i * (NODE_W + 60), y: 200 };
      return acc;
    }, {}));
  // stepIdsKey is a stable string derived from step ids — safe to use as dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdsKey]);

  // Keep a ref to canvasRef.current so callbacks always read the latest DOM node
  const canvasElRef = canvasRef;

  function getCanvasXY(e) {
    const el = canvasElRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop };
  }

  function handleMouseDown(e, stepId) {
    e.preventDefault();
    const { x, y } = getCanvasXY(e);
    const pos = positions[stepId] || { x: 0, y: 0 };
    setDragging({ id: stepId, offsetX: x - pos.x, offsetY: y - pos.y });
    setSelected(stepId);
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const el = canvasElRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft;
    const y = e.clientY - rect.top + el.scrollTop;
    const nx = Math.max(0, Math.min(CANVAS_W - NODE_W, snap(x - dragging.offsetX)));
    const ny = Math.max(0, Math.min(CANVAS_H - NODE_H, snap(y - dragging.offsetY)));
    setPositions(prev => ({ ...prev, [dragging.id]: { x: nx, y: ny } }));
  // canvasElRef is a stable ref object — including it doesn't cause re-creation
  }, [dragging, canvasElRef]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(null);
    // Debounce save layout to API
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setPositions(prev => { onLayoutChange(prev); return prev; });
    }, 600);
  }, [dragging, onLayoutChange]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Build SVG edges
  const edges = steps.slice(0, -1).map((step, i) => {
    const from = positions[step.id];
    const to = positions[steps[i + 1].id];
    if (!from || !to) return null;
    const x1 = from.x + NODE_W / 2;
    const y1 = from.y + NODE_H;
    const x2 = to.x + NODE_W / 2;
    const y2 = to.y;
    const cy1 = y1 + Math.max(40, (y2 - y1) * 0.5);
    const cy2 = y2 - Math.max(40, (y2 - y1) * 0.5);
    return (
      <g key={step.id + '-edge'}>
        <path
          d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
          fill="none"
          stroke={step.step_type === 'condition' ? '#ca8a04' : step.step_type === 'parallel' ? '#7c3aed' : '#2563eb'}
          strokeWidth="2"
          strokeDasharray="6 3"
          opacity="0.7"
        />
        <polygon
          points={`${x2},${y2} ${x2 - 5},${y2 - 8} ${x2 + 5},${y2 - 8}`}
          fill={step.step_type === 'condition' ? '#ca8a04' : step.step_type === 'parallel' ? '#7c3aed' : '#2563eb'}
          opacity="0.7"
        />
      </g>
    );
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#2a2d35] bg-[#0d0d0f]" style={{ height: 500 }}>
      {/* Canvas toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={onAddStep}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 bg-[#16181c] border border-blue-500/30 hover:border-blue-500/60 rounded-lg transition-colors shadow-lg"
        >
          <Plus size={13} /> Add Node
        </button>
      </div>

      {steps.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
          <Workflow size={32} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">Canvas is empty</p>
          <button onClick={onAddStep} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Add First Node</button>
        </div>
      )}

      {/* Scrollable canvas with dot grid */}
      <div
        ref={canvasRef}
        className="overflow-auto w-full h-full select-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #2a2d35 1px, transparent 1px)',
          backgroundSize: `${GRID * 2}px ${GRID * 2}px`,
        }}
      >
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
          {/* SVG edges layer */}
          <svg
            ref={svgRef}
            style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}
          >
            {edges}
          </svg>

          {/* Node cards */}
          {steps.map((step, idx) => {
            const pos = positions[step.id] || { x: 80 + idx * (NODE_W + 60), y: 200 };
            const Icon = STEP_TYPE_ICONS[step.step_type] || Bot;
            const colors = STEP_COLORS[step.step_type] || STEP_COLORS.agent;
            const isSelected = selected === step.id;

            return (
              <div
                key={step.id}
                onMouseDown={e => handleMouseDown(e, step.id)}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: NODE_W,
                  cursor: dragging?.id === step.id ? 'grabbing' : 'grab',
                  zIndex: isSelected ? 10 : 1,
                  userSelect: 'none',
                }}
                className={`rounded-xl border-2 shadow-lg transition-shadow ${colors.bg} ${isSelected ? 'border-blue-400 shadow-blue-500/20' : colors.border}`}
              >
                {/* Step index badge */}
                <div className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-[#1e2128] border border-[#2a2d35] flex items-center justify-center text-xs text-gray-500 font-medium">
                  {idx + 1}
                </div>
                {/* Delete button */}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onDelete(step.id); }}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-[#1e2128] border border-[#2a2d35] flex items-center justify-center text-gray-500 hover:text-red-400 hover:border-red-400/40 transition-colors"
                >
                  <X size={10} />
                </button>

                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={14} className={colors.icon} />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{STEP_TYPE_LABELS[step.step_type]}</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{step.name}</p>
                  {step.agent_name && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1">
                      <Bot size={9} /> {step.agent_name}
                    </p>
                  )}
                  {!step.agent_id && step.step_type !== 'condition' && (
                    <p className="text-xs text-yellow-500/60 mt-0.5">No agent</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
  const [reordering, setReordering] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'canvas'

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

  async function handleReorder(reorderedSteps) {
    // Optimistic update
    setSteps(reorderedSteps);
    setReordering(true);
    try {
      await api.put(`/flows/${id}/steps/reorder`, {
        step_ids: reorderedSteps.map(s => s.id),
      });
    } catch (err) {
      console.error('Reorder failed:', err);
      // Reload to restore correct order
      load();
    } finally {
      setReordering(false);
    }
  }

  async function handleCanvasLayoutChange(positions) {
    try {
      await api.put(`/flows/${id}`, { canvas_layout_json: positions });
    } catch (err) {
      console.error('Canvas layout save failed:', err);
    }
  }

  // Memoize parsed canvas layout to avoid JSON.parse on every render
  const parsedCanvasLayout = React.useMemo(() => {
    if (!flow?.canvas_layout_json) return null;
    try { return JSON.parse(flow.canvas_layout_json); } catch { return null; }
  }, [flow?.canvas_layout_json]);

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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Steps ({steps.length})</h2>
              {reordering && <Loader size={12} className="animate-spin text-blue-400" />}
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-[#16181c] border border-[#2a2d35] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  title="List view"
                  className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <List size={13} />
                </button>
                <button
                  onClick={() => setViewMode('canvas')}
                  title="Canvas view"
                  className={`p-1.5 rounded transition-colors ${viewMode === 'canvas' ? 'bg-blue-600/30 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <LayoutTemplate size={13} />
                </button>
              </div>
              <button
                onClick={() => setShowAddStep(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/60 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Add Step
              </button>
            </div>
          </div>

          {steps.length === 0 && viewMode === 'list' ? (
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
          ) : viewMode === 'canvas' ? (
            <FlowCanvas
              steps={steps}
              flowId={id}
              canvasLayout={parsedCanvasLayout}
              onLayoutChange={handleCanvasLayoutChange}
              onDelete={deleteStep}
              onAddStep={() => setShowAddStep(true)}
            />
          ) : (
            <>
              <p className="text-xs text-gray-600 mb-3 flex items-center gap-1.5">
                <GripVertical size={11} />
                Drag steps to reorder them
              </p>
              <DraggableStepList steps={steps} onReorder={handleReorder} onDelete={deleteStep} />
            </>
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
