import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Bot, Users, Cpu, Cloud,
  PlaySquare, Settings, MessageSquare, Workflow, ChevronLeft,
  ChevronRight, Zap, Server, LogOut, Building2
} from 'lucide-react';
import { setToken } from './api.js';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/runtimes', icon: Cpu, label: 'Runtimes' },
  { to: '/providers', icon: Cloud, label: 'Providers' },
  { to: '/skills', icon: Zap, label: 'Skills' },
  { to: '/mcp', icon: Server, label: 'MCP' },
  { to: '/queue', icon: PlaySquare, label: 'Queue' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/flows', icon: Workflow, label: 'Flows' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function getStoredUser() {
  try {
    const token = localStorage.getItem('foundry_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export default function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user?.username || 'F';
  const initials = displayName.slice(0, 2).toUpperCase();

  function handleLogout() {
    setToken(null);
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-[#0d0d0f] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col flex-shrink-0 bg-[#16181c] border-r border-[#2a2d35] transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 h-14 border-b border-[#2a2d35] ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-base tracking-tight">Foundry</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                } ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-[#2a2d35] text-gray-500 hover:text-gray-300 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 h-14 bg-[#16181c] border-b border-[#2a2d35] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Default Workspace</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.username && (
              <span className="text-xs text-gray-500 mr-1">{user.username}</span>
            )}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
            >
              <LogOut size={15} />
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white" title={user?.username || 'Guest'}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

