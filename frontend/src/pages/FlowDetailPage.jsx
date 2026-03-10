import React from 'react';
import { useParams } from 'react-router-dom';
import { Workflow } from 'lucide-react';

export default function FlowDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Flow Detail</h1>
        <p className="text-gray-400 mt-1">Flow ID: {id}</p>
      </div>

      <div className="bg-[#16181c] border border-[#2a2d35] rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Workflow size={32} className="text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Flow Detail — Coming Soon</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Flow execution details, history, and editing will be available when the Flow Builder feature launches.
        </p>
      </div>
    </div>
  );
}
