import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Bot, Users, PlaySquare, ArrowRight, Loader, DollarSign, Coins, TrendingUp, BarChart2 } from 'lucide-react';
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

function CostSummary({ costs, loading }) {
  const { totals, byAgent } = costs || {};
  const totalCost = totals?.total_cost_usd || 0;
  const totalTokens = (totals?.total_tokens_input || 0) + (totals?.total_tokens_output || 0);

  return (
    <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d35]">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-green-400" />
          <h2 className="font-semibold text-white">Cost This Month</h2>
        </div>
        <Link to="/queue" className="text-sm text-blue-400 hover:text-blue-300">Details →</Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Total Cost</div>
              <div className="text-xl font-bold text-green-400">${totalCost.toFixed(4)}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Total Tokens</div>
              <div className="text-xl font-bold text-blue-400">{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</div>
            </div>
          </div>
          {byAgent && byAgent.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">By Agent</div>
              {byAgent.slice(0, 4).map(a => {
                const budget = a.monthly_budget_usd;
                const pct = budget ? Math.min(100, (a.cost_usd / budget) * 100) : null;
                return (
                  <div key={a.agent_id || a.agent_name} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300 truncate">{a.agent_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">${(a.cost_usd || 0).toFixed(4)}</span>
                      </div>
                      <div className="h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct !== null && pct > 80 ? 'bg-red-500' : pct !== null && pct > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: pct !== null ? `${pct}%` : '4px' }}
                        />
                      </div>
                    </div>
                    {budget && <span className="text-xs text-gray-600 flex-shrink-0">${budget}/mo</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-2">No cost data yet — run an agent to see usage.</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple SVG bar chart component — no external library required.
 * Renders a sparkline-style bar chart for daily cost/token data.
 */
function BarChart({ data, valueKey, label, color = '#3b82f6', formatValue }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-600 text-xs">No data yet</div>
    );
  }

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 0.000001);
  const barWidth = Math.max(4, Math.floor(280 / data.length) - 2);
  const chartHeight = 64;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${data.length * (barWidth + 2)} ${chartHeight + 20}`} className="overflow-visible">
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const barH = Math.max(2, Math.round((val / maxVal) * chartHeight));
          const x = i * (barWidth + 2);
          const y = chartHeight - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                fill={color}
                opacity={0.8}
              />
              {data.length <= 14 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {d.date?.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {maxVal > 0 && (
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{data[0]?.date}</span>
          <span className="text-gray-500">max: {formatValue ? formatValue(maxVal) : maxVal}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      )}
    </div>
  );
}

function AnalyticsCharts({ costs, loading }) {
  const { byDay, totals } = costs || {};

  return (
    <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2a2d35]">
        <BarChart2 size={16} className="text-purple-400" />
        <h2 className="font-semibold text-white">Analytics</h2>
        <span className="text-xs text-gray-500 ml-auto">This month</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Daily Cost (USD)</div>
            <BarChart
              data={byDay}
              valueKey="cost_usd"
              label="Cost"
              color="#34d399"
              formatValue={v => `$${v.toFixed(4)}`}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Daily Token Usage</div>
            <BarChart
              data={byDay}
              valueKey="total_tokens"
              label="Tokens"
              color="#818cf8"
              formatValue={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Runs</div>
                <div className="text-lg font-bold text-white">{totals?.run_count || 0}</div>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Input Tokens</div>
                <div className="text-lg font-bold text-blue-400">
                  {(totals?.total_tokens_input || 0) >= 1000
                    ? `${((totals?.total_tokens_input || 0) / 1000).toFixed(1)}k`
                    : (totals?.total_tokens_input || 0)}
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Output Tokens</div>
                <div className="text-lg font-bold text-purple-400">
                  {(totals?.total_tokens_output || 0) >= 1000
                    ? `${((totals?.total_tokens_output || 0) / 1000).toFixed(1)}k`
                    : (totals?.total_tokens_output || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function DashboardPage() {
  const [stats, setStats] = useState({ projects: 0, runs: 0, agents: 0, teams: 0 });
  const [recentRuns, setRecentRuns] = useState([]);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costsLoading, setCostsLoading] = useState(true);

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

    async function loadCosts() {
      try {
        const ws = await api.get('/workspaces');
        const wsId = ws[0]?.id;
        if (wsId) {
          const data = await api.get(`/runs/stats/costs?workspace_id=${wsId}`);
          setCosts(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCostsLoading(false);
      }
    }

    load();
    loadCosts();
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent runs (2/3 width) */}
        <div className="lg:col-span-2 bg-[#16181c] border border-[#2a2d35] rounded-xl">
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
                  <div className="text-right flex-shrink-0">
                    {run.cost_usd > 0 && <div className="text-xs text-green-400">${run.cost_usd.toFixed(4)}</div>}
                    <div className="text-xs text-gray-500">
                      {new Date(run.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Cost summary (1/3 width) */}
        <CostSummary costs={costs} loading={costsLoading} />
      </div>

      {/* Analytics charts */}
      <div className="mb-6">
        <AnalyticsCharts costs={costs} loading={costsLoading} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/projects', label: 'Create a project →', desc: 'Set up a new project with GitHub repo binding' },
          { to: '/agents', label: 'Configure agents →', desc: 'Add AI agents powered by providers or runtimes' },
          { to: '/providers', label: 'Add providers →', desc: 'Connect OpenAI, Anthropic, and more' },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
          >
            <div className="font-medium text-white group-hover:text-blue-300 mb-1">{link.label}</div>
            <div className="text-xs text-gray-500">{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
