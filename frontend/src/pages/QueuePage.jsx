import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlaySquare, Loader, RefreshCw, Filter } from 'lucide-react';
import api from '../components/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const STATUS_FILTERS = ['all', 'queued', 'running', 'success', 'failed', 'cancelled'];

export default function QueuePage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const url = filter !== 'all' ? `/runs?status=${filter}` : '/runs';
      const data = await api.get(url);
      setRuns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function handleCancel(runId, e) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmCancel(runId);
  }

  async function confirmCancelRun() {
    try {
      await api.post(`/runs/${confirmCancel}/cancel`, {});
      load(true);
    } catch (err) {
      console.error(err);
    }
  }

  const counts = STATUS_FILTERS.slice(1).reduce((acc, s) => ({
    ...acc,
    [s]: runs.filter(r => r.status === s).length,
  }), {});

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Run Queue</h1>
          <p className="text-gray-400 mt-1">Monitor and manage agent execution runs</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 border border-[#2a2d35] hover:border-[#3a3d45] text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-[#16181c] border border-[#2a2d35] text-gray-400 hover:text-white'
            }`}
          >
            {s === 'all' ? 'All' : s}
            {s !== 'all' && counts[s] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({counts[s]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader size={20} className="animate-spin mr-2" /> Loading runs...
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <PlaySquare size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400 mb-2">No runs {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-blue-400 text-sm hover:underline">Show all runs</button>
          )}
        </div>
      ) : (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-6 py-3 text-xs text-gray-500 border-b border-[#2a2d35] font-medium uppercase tracking-wide">
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Task</div>
            <div className="col-span-2">Project</div>
            <div className="col-span-2">Agent</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y divide-[#2a2d35]">
            {runs.map(run => (
              <Link
                key={run.id}
                to={`/runs/${run.id}`}
                className="grid grid-cols-12 items-center px-6 py-3 hover:bg-white/3 transition-colors"
              >
                <div className="col-span-2">
                  <StatusBadge status={run.status} showDot />
                </div>
                <div className="col-span-3">
                  <div className="text-sm font-medium text-white truncate">
                    {run.card_title || `Run ${run.id.slice(0, 8)}`}
                  </div>
                </div>
                <div className="col-span-2 text-sm text-gray-400 truncate">{run.project_name || '—'}</div>
                <div className="col-span-2 text-sm text-gray-400 truncate">{run.agent_name || '—'}</div>
                <div className="col-span-2 text-xs text-gray-500">
                  {new Date(run.created_at).toLocaleString()}
                </div>
                <div className="col-span-1 flex justify-end">
                  {['queued', 'running'].includes(run.status) && (
                    <button
                      onClick={(e) => handleCancel(run.id, e)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={confirmCancelRun}
        title="Cancel Run"
        message="Are you sure you want to cancel this run?"
        confirmLabel="Cancel Run"
      />
    </div>
  );
}
