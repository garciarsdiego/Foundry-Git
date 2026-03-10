import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-4">
      <div className="w-16 h-16 bg-[#16181c] border border-[#2a2d35] rounded-2xl flex items-center justify-center mb-4">
        <SearchX size={28} className="text-gray-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">404</h1>
      <p className="text-gray-400 mb-6 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-[#16181c] border border-[#2a2d35] hover:border-[#3a3d45] text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ArrowLeft size={14} /> Go back
        </button>
        <Link
          to="/"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
