import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { setToken } from './components/api.js';
import DashboardPage from './pages/DashboardPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import TaskDetailPage from './pages/TaskDetailPage.jsx';
import AgentsPage from './pages/AgentsPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import RuntimesPage from './pages/RuntimesPage.jsx';
import ProvidersPage from './pages/ProvidersPage.jsx';
import QueuePage from './pages/QueuePage.jsx';
import RunDetailPage from './pages/RunDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import FlowsPage from './pages/FlowsPage.jsx';
import FlowBuilderPage from './pages/FlowBuilderPage.jsx';
import FlowDetailPage from './pages/FlowDetailPage.jsx';
import SkillsPage from './pages/SkillsPage.jsx';
import McpPage from './pages/McpPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/board" element={<BoardPage />} />
            <Route path="projects/:id/board/:taskId" element={<TaskDetailPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="runtimes" element={<RuntimesPage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="runs/:runId" element={<RunDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="flows" element={<FlowsPage />} />
            <Route path="flows/new" element={<FlowBuilderPage />} />
            <Route path="flows/:id" element={<FlowDetailPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="mcp" element={<McpPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
