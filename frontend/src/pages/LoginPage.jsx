import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Loader } from 'lucide-react';
import { setToken } from '../components/api.js';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if auth is even enabled
  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        if (!data.auth_enabled) {
          setToken(null);
          navigate('/', { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return setError('Password is required');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      setToken(data.token);
      navigate('/', { replace: true });
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Foundry</h1>
          <p className="text-gray-400 text-sm mt-1">AI Agent Orchestration</p>
        </div>

        {/* Card */}
        <div className="bg-[#16181c] border border-[#2a2d35] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-gray-400" />
            <h2 className="text-base font-semibold text-white">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter your password"
                className="w-full bg-[#0d0d0f] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader size={14} className="animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-4">
            Set <code className="text-gray-500">FOUNDRY_ADMIN_PASSWORD</code> in backend .env to enable authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
