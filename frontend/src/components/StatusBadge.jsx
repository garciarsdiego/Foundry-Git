import React from 'react';

const STATUS_STYLES = {
  queued: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  running: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  todo: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  review: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  done: 'bg-green-500/20 text-green-400 border border-green-500/30',
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const STATUS_DOTS = {
  queued: 'bg-yellow-400',
  running: 'bg-blue-400 animate-pulse',
  success: 'bg-green-400',
  failed: 'bg-red-400',
  cancelled: 'bg-gray-400',
};

export default function StatusBadge({ status, showDot = false, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  const dot = STATUS_DOTS[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {showDot && dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {status}
    </span>
  );
}
