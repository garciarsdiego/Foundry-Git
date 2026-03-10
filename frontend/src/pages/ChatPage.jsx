import React, { useState } from 'react';
import { MessageSquare, Send, Bot } from 'lucide-react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Chat with AI agents is coming soon! This feature will allow you to interact directly with your configured agents, ask them to work on tasks, and monitor their progress in real time.' }
  ]);

  function handleSend() {
    if (!input.trim()) return;
    setMessages(m => [
      ...m,
      { role: 'user', content: input },
      { role: 'assistant', content: '🚧 Chat integration is not yet implemented. Configure an agent and use the Run system to execute tasks.' }
    ]);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2d35] bg-[#16181c] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <MessageSquare size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-semibold text-white">Chat</h1>
            <p className="text-xs text-gray-500">Coming Soon — Direct agent interaction</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Coming soon banner */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center">
          <MessageSquare size={40} className="mx-auto mb-4 text-blue-400 opacity-60" />
          <h2 className="text-lg font-semibold text-white mb-2">Chat — Coming Soon</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            This feature will provide a conversational interface to interact with your AI agents directly.
            You'll be able to assign tasks, monitor progress, and receive responses in real time.
          </p>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-blue-400" />
              </div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-[#16181c] border border-[#2a2d35] text-gray-300'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2d35] bg-[#16181c] flex-shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message... (feature coming soon)"
            className="flex-1 bg-[#0d0d0f] border border-[#2a2d35] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
