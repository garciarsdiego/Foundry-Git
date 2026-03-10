import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Bot, Plus, ChevronDown, Loader, Clock, X } from 'lucide-react';
import api from '../components/api.js';

function MessageBubble({ msg }) {
  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role !== 'user' && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          msg.role === 'error' ? 'bg-red-600/20' : 'bg-blue-600/20'
        }`}>
          <Bot size={14} className={msg.role === 'error' ? 'text-red-400' : 'text-blue-400'} />
        </div>
      )}
      <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
        msg.role === 'user'
          ? 'bg-blue-600 text-white rounded-br-sm'
          : msg.role === 'error'
          ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm'
          : 'bg-[#1e2128] border border-[#2a2d35] text-gray-200 rounded-bl-sm'
      }`}>
        {msg.content}
        {msg.metadata?.simulated && (
          <div className="mt-2 pt-2 text-xs text-gray-500 border-t border-[#2a2d35]">
            ⚠ Simulated — configure a provider API key for real AI
          </div>
        )}
        {msg.metadata?.provider && (
          <div className="mt-1 text-xs text-gray-500">{msg.metadata.provider} · {msg.metadata.model}</div>
        )}
      </div>
      {msg.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">
          U
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    const existing = localStorage.getItem('chat_session_id');
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newId);
    return newId;
  });
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get('/workspaces').then(ws => { if (ws?.length) setWorkspace(ws[0]); }).catch(() => {});
    api.get('/agents').then(setAgents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    setHistoryLoading(true);
    api.get(`/chat/sessions/${sessionId}`)
      .then(msgs => {
        setMessages((msgs || []).map(m => ({
          id: m.id, role: m.role, content: m.content,
          metadata: m.metadata_json ? JSON.parse(m.metadata_json) : undefined,
        })));
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false));
  }, [sessionId]);

  const loadSessions = useCallback(() => {
    if (!workspace) return;
    api.get(`/chat/sessions?workspace_id=${workspace.id}`).then(setSessions).catch(() => {});
  }, [workspace]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading || !workspace) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: crypto.randomUUID() }]);
    setLoading(true);
    try {
      const response = await api.post('/chat', {
        workspace_id: workspace.id, agent_id: selectedAgent?.id || null,
        message: userMessage, session_id: sessionId,
      });
      setMessages(prev => [...prev, {
        role: 'assistant', content: response.content,
        id: response.message_id, metadata: response.metadata,
      }]);
      loadSessions();
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: `Error: ${err.message}`, id: crypto.randomUUID() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function startNewSession() {
    const newId = crypto.randomUUID();
    localStorage.setItem('chat_session_id', newId);
    setSessionId(newId);
    setMessages([]);
    setShowSessions(false);
  }

  function switchSession(sid) {
    localStorage.setItem('chat_session_id', sid);
    setSessionId(sid);
    setShowSessions(false);
  }

  return (
    <div className="flex h-full max-h-full overflow-hidden">
      {showSessions && (
        <aside className="w-60 flex-shrink-0 bg-[#16181c] border-r border-[#2a2d35] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d35]">
            <span className="text-sm font-medium text-white">Sessions</span>
            <button onClick={() => setShowSessions(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">No sessions yet</p>
            ) : sessions.map(s => (
              <button key={s.session_id} onClick={() => switchSession(s.session_id)}
                className={`w-full text-left px-4 py-2.5 transition-colors hover:bg-white/5 ${s.session_id === sessionId ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="text-xs text-gray-300 font-mono truncate">{s.session_id.slice(0, 13)}…</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.message_count} msgs · {new Date(s.last_message_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[#2a2d35]">
            <button onClick={startNewSession} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Plus size={14} /> New session
            </button>
          </div>
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <div className="px-5 py-3.5 border-b border-[#2a2d35] bg-[#16181c] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSessions(!showSessions)} title="Session history"
                className={`p-1.5 rounded-lg transition-colors ${showSessions ? 'text-blue-400 bg-blue-600/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                <Clock size={15} />
              </button>
              <div className="w-px h-5 bg-[#2a2d35]" />
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <MessageSquare size={14} className="text-blue-400" />
              </div>
              <div>
                <h1 className="font-semibold text-white text-sm">Chat</h1>
                <p className="text-xs text-gray-500">{selectedAgent ? selectedAgent.name : 'No agent selected'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowAgentPicker(!showAgentPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2128] border border-[#2a2d35] rounded-lg text-sm text-gray-300 hover:border-[#3a3d45] transition-colors">
                  <Bot size={13} className="text-blue-400" />
                  {selectedAgent ? selectedAgent.name : 'Select Agent'}
                  <ChevronDown size={11} className="text-gray-500" />
                </button>
                {showAgentPicker && (
                  <div className="absolute right-0 top-full mt-1 w-60 bg-[#1e2128] border border-[#2a2d35] rounded-xl shadow-2xl z-20 overflow-hidden">
                    <div className="p-1">
                      <button onClick={() => { setSelectedAgent(null); setShowAgentPicker(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        No agent (generic)
                      </button>
                      {agents.map(agent => (
                        <button key={agent.id} onClick={() => { setSelectedAgent(agent); setShowAgentPicker(false); }}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${selectedAgent?.id === agent.id ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.execution_mode} mode</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={startNewSession} title="New conversation"
                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" onClick={() => setShowAgentPicker(false)}>
          {historyLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <Loader size={16} className="animate-spin mr-2" /> Loading history...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Start a conversation</h2>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                {selectedAgent ? `Chatting with ${selectedAgent.name}. Configure a provider for real AI.` : 'Select an agent above or just start typing.'}
              </p>
            </div>
          ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-blue-400" />
              </div>
              <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-[#1e2128] border border-[#2a2d35]">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[#2a2d35] bg-[#16181c] flex-shrink-0">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={selectedAgent ? `Message ${selectedAgent.name}… (Shift+Enter for new line)` : 'Type a message…'}
              disabled={loading} rows={1}
              className="flex-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600 disabled:opacity-50 resize-none leading-relaxed"
              style={{ minHeight: '46px', maxHeight: '120px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors self-end flex-shrink-0">
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
