import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  navigate: (page: string) => void;
}

export default function Login({ onLoginSuccess, navigate }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginErr) {
      setError(loginErr.message || 'Invalid email or password');
      return;
    }

    if (data && data.user) {
      onLoginSuccess(data.user);
      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('admin');
      } else if (data.user.role === 'provider') {
        navigate('provider');
      } else {
        navigate('home');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-cyan-500/20 rounded-tr-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-cyan-500/20 rounded-bl-xl"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-2xl font-bold mb-3 neon-glow-cyan">
            ⚡
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">GRIDVOLT</h2>
          <p className="text-slate-400 text-xs mt-1">EV Rescue Emergency Roadside Assistance</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
              placeholder="name@gridvolt.app"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition shadow-lg shadow-cyan-500/10 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Decrypting Credentials...' : 'Access Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          First time?{' '}
          <button onClick={() => navigate('signup')} className="text-cyan-400 hover:underline">
            Register EV or Provider
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-900/80 flex justify-between text-[10px] text-slate-600">
          <div>Prototype v1.0</div>
          <div>Secured with Supabase</div>
        </div>
      </div>
    </div>
  );
}
