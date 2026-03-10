import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Bot, Users, PlaySquare, ArrowRight, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../components/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-5 hover:border-[#3a3d45] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        {to && <ArrowRight size={14} className="text-gray-600" />}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ projects: 0, runs: 0, agents: 0, teams: 0 });
  const [recentRuns, setRecentRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projects, runs, agents, teams] = await Promise.all([
          api.get('/projects'),
          api.get('/runs'),
          api.get('/agents'),
          api.get('/teams'),
        ]);
        setStats({
          projects: projects.length,
          runs: runs.filter(r => ['queued', 'running'].includes(r.status)).length,
          agents: agents.length,
          teams: teams.length,
        });
        setRecentRuns(runs.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your AI agent workspace</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="Projects" value={loading ? '—' : stats.projects} color="bg-blue-600" to="/projects" />
        <StatCard icon={PlaySquare} label="Active Runs" value={loading ? '—' : stats.runs} color="bg-purple-600" to="/queue" />
        <StatCard icon={Bot} label="Agents" value={loading ? '—' : stats.agents} color="bg-green-600" to="/agents" />
        <StatCard icon={Users} label="Teams" value={loading ? '—' : stats.teams} color="bg-orange-600" to="/teams" />
      </div>

      {/* Recent runs */}
      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d35]">
          <h2 className="font-semibold text-white">Recent Runs</h2>
          <Link to="/queue" className="text-sm text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <PlaySquare size={32} className="mx-auto mb-3 opacity-40" />
            <p>No runs yet. Create a project and run an agent task.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2d35]">
            {recentRuns.map(run => (
              <Link
                key={run.id}
                to={`/runs/${run.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-white/3 transition-colors"
              >
                <StatusBadge status={run.status} showDot />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {run.card_title || `Run ${run.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-gray-500">{run.project_name} · {run.agent_name || 'No agent'}</div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(run.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/projects', label: 'Create a project', desc: 'Set up a new project with GitHub repo binding' },
          { to: '/agents', label: 'Configure agents', desc: 'Add AI agents powered by providers or runtimes' },
          { to: '/providers', label: 'Add providers', desc: 'Connect OpenAI, Anthropic, and more' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
          >
            <div className="font-medium text-white group-hover:text-blue-300 mb-1 flex items-center gap-2">
              {link.label} <ArrowRight size={13} />
            </div>
            <div className="text-xs text-gray-500">{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
