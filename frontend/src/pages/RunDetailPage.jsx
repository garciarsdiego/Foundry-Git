import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader, RefreshCw, Terminal, Info, AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';
import api from '../components/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const EVENT_ICONS = {
  created: Info,
  started: Zap,
  stdout: Terminal,
  stderr: AlertCircle,
  success: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
  error: AlertCircle,
  api_call: Zap,
  api_response: CheckCircle,
  runtime_dispatch: Zap,
  provider_dispatch: Zap,
  fallback: AlertCircle,
};

const EVENT_COLORS = {
  created: 'text-gray-400',
  started: 'text-blue-400',
  stdout: 'text-gray-300',
  stderr: 'text-yellow-400',
  success: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-gray-400',
  error: 'text-red-400',
  api_call: 'text-blue-400',
  api_response: 'text-green-400',
  runtime_dispatch: 'text-purple-400',
  provider_dispatch: 'text-blue-400',
  fallback: 'text-yellow-400',
};

export default function RunDetailPage() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const eventsEndRef = useRef(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api.get(`/runs/${runId}`);
      setRun(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [runId]);

  useEffect(() => {
    if (run?.status === 'running' || run?.status === 'queued') {
      const interval = setInterval(() => load(true), 2000);
      return () => clearInterval(interval);
    }
  }, [run?.status]);

  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [run?.events?.length]);

  async function handleCancel() {
    try {
      await api.post(`/runs/${runId}/cancel`, {});
      load(true);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading run...
    </div>
  );

  if (!run) return (
    <div className="p-6 text-center text-gray-400">
      <p>Run not found.</p>
      <Link to="/queue" className="text-blue-400 hover:underline">Back to queue</Link>
    </div>
  );

  const startMs = run.started_at ? new Date(run.started_at).getTime() : NaN;
  const endMs = run.finished_at ? new Date(run.finished_at).getTime() : NaN;
  const duration = !isNaN(startMs) && !isNaN(endMs) && endMs > startMs
    ? Math.round((endMs - startMs) / 1000)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/queue" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={14} /> Run Queue
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={run.status} showDot />
            <h1 className="text-xl font-bold text-white">
              {run.card_title || `Run ${runId.slice(0, 8)}`}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {run.project_name && <span>Project: <span className="text-gray-300">{run.project_name}</span></span>}
            {run.agent_name && <span>Agent: <span className="text-gray-300">{run.agent_name}</span></span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2d35] rounded-lg text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {['queued', 'running'].includes(run.status) && (
            <button onClick={() => setConfirmCancel(true)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Run details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Status', value: <StatusBadge status={run.status} /> },
          { label: 'Runtime Type', value: run.runtime_type || run.provider_type || '—' },
          { label: 'Duration', value: duration !== null ? `${duration}s` : '—' },
          { label: 'Exit Code', value: run.exit_code !== null ? String(run.exit_code) : '—' },
        ].map(item => (
          <div key={item.label} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-2">{item.label}</div>
            <div className="text-sm text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {run.error_message && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle size={16} /> Error
          </div>
          <p className="text-sm text-red-300">{run.error_message}</p>
        </div>
      )}

      {(run.branch_name || run.pr_url) && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          {run.branch_name && (
            <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Branch</div>
              <code className="text-sm text-green-400">{run.branch_name}</code>
            </div>
          )}
          {run.pr_url && (
            <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Pull Request</div>
              <a href={run.pr_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                #{run.pr_number}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Events log */}
      <div className="bg-[#0d0d0f] border border-[#2a2d35] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2d35] bg-[#16181c]">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-gray-400" />
            <span className="text-sm font-medium text-white">Run Events</span>
            <span className="text-xs bg-[#2a2d35] text-gray-400 px-2 py-0.5 rounded-full">{run.events?.length || 0}</span>
          </div>
          {['running', 'queued'].includes(run.status) && (
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Live
            </div>
          )}
        </div>
        <div className="p-4 font-mono text-xs max-h-[500px] overflow-y-auto">
          {run.events?.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No events yet...</div>
          ) : (
            run.events?.map(event => {
              const Icon = EVENT_ICONS[event.event_type] || Info;
              const color = EVENT_COLORS[event.event_type] || 'text-gray-400';
              return (
                <div key={event.id} className="flex items-start gap-3 mb-2 group">
                  <span className="text-gray-600 flex-shrink-0 mt-0.5">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                  <Icon size={12} className={`flex-shrink-0 mt-0.5 ${color}`} />
                  <span className={`flex-1 leading-relaxed ${color}`}>{event.message}</span>
                </div>
              );
            })
          )}
          <div ref={eventsEndRef} />
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
        <span>Created: {new Date(run.created_at).toLocaleString()}</span>
        {run.started_at && <span>Started: {new Date(run.started_at).toLocaleString()}</span>}
        {run.finished_at && <span>Finished: {new Date(run.finished_at).toLocaleString()}</span>}
      </div>

      <ConfirmModal
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Run"
        message="Are you sure you want to cancel this run?"
        confirmLabel="Cancel Run"
      />
    </div>
  );
}
