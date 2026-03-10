import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, Plus, ChevronDown, Loader } from 'lucide-react';
import api from '../components/api.js';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('chat_session_id') || crypto.randomUUID();
  });
  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get('/workspaces').then(ws => {
      if (ws?.length) setWorkspace(ws[0]);
    }).catch(() => {});
    api.get('/agents').then(setAgents).catch(() => {});
    // Persist sessionId to localStorage on mount
    localStorage.setItem('chat_session_id', sessionId);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    if (!workspace) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, id: crypto.randomUUID() }]);
    setLoading(true);

    try {
      const response = await api.post('/chat', {
        workspace_id: workspace.id,
        agent_id: selectedAgent?.id || null,
        message: userMessage,
        session_id: sessionId,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        id: response.message_id,
        metadata: response.metadata,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${err.message}`,
        id: crypto.randomUUID(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function startNewSession() {
    const newSessionId = crypto.randomUUID();
    setMessages([]);
    setSessionId(newSessionId);
    localStorage.setItem('chat_session_id', newSessionId);
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2d35] bg-[#16181c] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <MessageSquare size={16} className="text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Chat</h1>
              <p className="text-xs text-gray-500">
                {selectedAgent ? `Talking to: ${selectedAgent.name}` : 'No agent selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Agent picker */}
            <div className="relative">
              <button
                onClick={() => setShowAgentPicker(!showAgentPicker)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2128] border border-[#2a2d35] rounded-lg text-sm text-gray-300 hover:border-[#3a3d45] transition-colors"
              >
                <Bot size={14} className="text-blue-400" />
                {selectedAgent ? selectedAgent.name : 'Select Agent'}
                <ChevronDown size={12} className="text-gray-500" />
              </button>
              {showAgentPicker && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#1e2128] border border-[#2a2d35] rounded-xl shadow-xl z-10 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => { setSelectedAgent(null); setShowAgentPicker(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      No agent (generic)
                    </button>
                    {agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => { setSelectedAgent(agent); setShowAgentPicker(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-gray-500">{agent.execution_mode} mode</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={startNewSession}
              title="New session"
              className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" onClick={() => setShowAgentPicker(false)}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Start a conversation</h2>
            <p className="text-gray-400 text-sm max-w-sm">
              {selectedAgent
                ? `Chat with ${selectedAgent.name}. Configure a provider API key for real AI responses.`
                : 'Select an agent above or type a message to get started.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'error' ? 'bg-red-600/20' : 'bg-blue-600/20'
              }`}>
                <Bot size={14} className={msg.role === 'error' ? 'text-red-400' : 'text-blue-400'} />
              </div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.role === 'error'
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-[#16181c] border border-[#2a2d35] text-gray-300'
            }`}>
              {msg.content}
              {msg.metadata?.simulated && (
                <div className="mt-2 text-xs text-gray-500 border-t border-[#2a2d35] pt-1">
                  Simulated response — configure a provider API key for real AI
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-400" />
            </div>
            <div className="px-4 py-3 rounded-xl bg-[#16181c] border border-[#2a2d35]">
              <Loader size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2d35] bg-[#16181c] flex-shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : 'Type a message...'}
            disabled={loading}
            className="flex-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
