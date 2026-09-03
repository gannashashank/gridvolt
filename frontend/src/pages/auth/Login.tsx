import React, { useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  navigate: (path: string) => void;
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
      setError(loginErr.message || 'Authentication failed. Please verify credentials.');
      return;
    }

    if (data && data.user) {
      onLoginSuccess(data.user);
      if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (data.user.role === 'provider') {
        navigate('/provider/dashboard');
      } else {
        navigate('/app/home');
      }
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-skyroot-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Atmospheric Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#22242A_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="w-2.5 h-2.5 bg-skyroot-accent"></span>
          <span className="font-mono text-sm tracking-[0.3em] font-semibold text-white uppercase">
            GRIDVOLT
          </span>
        </div>
        <h2 className="text-center text-2xl font-light tracking-tight text-white uppercase">
          Access Telemetry Portal
        </h2>
        <p className="mt-1 text-center text-xs font-mono uppercase tracking-widest text-skyroot-muted">
          Secured Infrastructure Access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="skyroot-card p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                Operator / User Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@gridvolt.app"
                className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2.5 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                Security Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2.5 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : 'AUTHORIZE SESSION'}
            </button>
          </form>

          {/* Demo Account Quick-Fill Buttons */}
          <div className="mt-8 pt-6 border-t border-skyroot-border">
            <span className="block text-[9px] font-mono uppercase tracking-widest text-skyroot-muted mb-3 text-center">
              Quick-Fill Test Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('user1@gridvolt.app')}
                className="px-2 py-1.5 bg-skyroot-black border border-skyroot-border hover:border-neutral-500 text-[10px] font-mono text-neutral-300 text-center uppercase tracking-wider transition-colors"
              >
                EV Driver
              </button>
              <button
                type="button"
                onClick={() => fillDemo('provider1@gridvolt.app')}
                className="px-2 py-1.5 bg-skyroot-black border border-skyroot-border hover:border-neutral-500 text-[10px] font-mono text-neutral-300 text-center uppercase tracking-wider transition-colors"
              >
                Provider
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@gridvolt.app')}
                className="px-2 py-1.5 bg-skyroot-black border border-skyroot-accent text-[10px] font-mono text-skyroot-accent text-center uppercase tracking-wider transition-colors"
              >
                Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <span className="text-xs text-neutral-500">Unregistered? </span>
            <button
              onClick={() => navigate('/signup')}
              className="text-xs font-mono uppercase tracking-wider text-skyroot-accent hover:underline"
            >
              Enroll Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
