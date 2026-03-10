import React from 'react';
import { Workflow, GitBranch, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FlowBuilderPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Flow Builder</h1>
        <p className="text-gray-400 mt-1">Create multi-agent workflows with conditional logic</p>
      </div>

      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Workflow size={32} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Flow Builder — Coming Soon</h2>
        <p className="text-gray-400 max-w-lg mx-auto mb-6">
          The visual flow builder will let you create complex multi-agent workflows with branching logic,
          parallelism, and conditional routing between different AI agents and runtimes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          {[
            { icon: Zap, title: 'Multi-agent Orchestration', desc: 'Chain multiple agents together in sequence or parallel' },
            { icon: GitBranch, title: 'Conditional Branching', desc: 'Route tasks based on agent output or custom conditions' },
            { icon: Workflow, title: 'Visual Editor', desc: 'Drag-and-drop flow creation with live preview' },
          ].map(feature => (
            <div key={feature.title} className="bg-[#0d0d0f] border border-[#2a2d35] rounded-xl p-4">
              <feature.icon size={20} className="text-blue-400 mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500">
          In the meantime, use the <Link to="/agents" className="text-blue-400 hover:underline">Agents</Link> and{' '}
          <Link to="/queue" className="text-blue-400 hover:underline">Queue</Link> to run individual agent tasks.
        </p>
      </div>
    </div>
  );
}
