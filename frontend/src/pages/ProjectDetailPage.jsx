import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Github, KanbanSquare, PlaySquare, Settings, ExternalLink, Loader, ArrowLeft } from 'lucide-react';
import api from '../components/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [runs, setRuns] = useState([]);
  const [tab, setTab] = useState('board');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [proj, projRuns] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/runs?project_id=${id}`),
        ]);
        setProject(proj);
        setRuns(projRuns);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <Loader size={20} className="animate-spin mr-2" /> Loading...
    </div>
  );

  if (!project) return (
    <div className="p-6 text-center text-gray-400">
      <p>Project not found.</p>
      <Link to="/projects" className="text-blue-400 hover:underline">Back to projects</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={14} /> Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-gray-400 mt-1">{project.description}</p>}
            {project.repo_owner && project.repo_name && (
              <a
                href={project.repo_url || `https://github.com/${project.repo_owner}/${project.repo_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mt-2 transition-colors"
              >
                <Github size={14} /> {project.repo_owner}/{project.repo_name} <ExternalLink size={11} />
              </a>
            )}
          </div>
          <Link
            to={`/projects/${id}/board`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            <KanbanSquare size={16} /> Open Board
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Runs', value: runs.length },
          { label: 'Successful', value: runs.filter(r => r.status === 'success').length },
          { label: 'Failed', value: runs.filter(r => r.status === 'failed').length },
        ].map(s => (
          <div key={s.label} className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#16181c] border border-[#2a2d35] rounded-xl p-1 w-fit">
        {[
          { id: 'board', icon: KanbanSquare, label: 'Board' },
          { id: 'runs', icon: PlaySquare, label: 'Runs' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'board' && (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-8 text-center">
          <KanbanSquare size={40} className="mx-auto mb-4 text-blue-400 opacity-60" />
          <p className="text-gray-300 mb-4">View and manage tasks on the Kanban board</p>
          <Link to={`/projects/${id}/board`} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm inline-flex items-center gap-2 transition-colors">
            <KanbanSquare size={15} /> Open Board
          </Link>
        </div>
      )}

      {tab === 'runs' && (
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl">
          {runs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <PlaySquare size={32} className="mx-auto mb-3 opacity-40" />
              <p>No runs for this project yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d35]">
              {runs.map(run => (
                <Link key={run.id} to={`/runs/${run.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-white/3 transition-colors">
                  <StatusBadge status={run.status} showDot />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{run.card_title || `Run ${run.id.slice(0, 8)}`}</div>
                    <div className="text-xs text-gray-500">{run.agent_name || 'No agent'}</div>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(run.created_at).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
