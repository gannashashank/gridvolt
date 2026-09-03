import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';

interface NavbarProps {
  user: any;
  currentPath: string;
  navigate: (path: string, params?: any) => void;
  onlineStatus?: boolean;
  onToggleOnline?: () => void;
}

export default function Navbar({
  user,
  currentPath,
  navigate,
  onlineStatus,
  onToggleOnline,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const role = user?.role || 'user';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-skyroot-black/90 backdrop-blur-md border-b border-skyroot-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand Monogram & Name */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => {
                if (role === 'admin') navigate('/admin/dashboard');
                else if (role === 'provider') navigate('/provider/dashboard');
                else navigate('/app/home');
              }}
              className="flex items-center space-x-2 text-left focus:outline-none group"
            >
              <span className="w-2.5 h-2.5 bg-skyroot-accent rounded-none transition-transform group-hover:scale-110"></span>
              <span className="font-mono text-sm tracking-[0.25em] font-semibold text-white uppercase">
                GRIDVOLT
              </span>
              <span className="text-[10px] tracking-widest text-skyroot-muted uppercase hidden sm:inline font-mono border-l border-skyroot-border pl-2">
                {role === 'admin' ? 'CONTROL ROOM' : role === 'provider' ? 'FLEET DISPATCH' : 'EV RESCUE'}
              </span>
            </button>

            {/* Role Badge for Admin */}
            {role === 'admin' && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-skyroot-card border border-skyroot-accent text-skyroot-accent">
                ADMIN CONSOLE
              </span>
            )}
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-[11px] font-mono uppercase tracking-[0.18em]">
            {role === 'user' && (
              <>
                <button
                  onClick={() => navigate('/app/home')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/app/home' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  CONSOLE
                </button>
                <button
                  onClick={() => navigate('/app/history')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/app/history' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  DISPATCH LOGS
                </button>
                <button
                  onClick={() => navigate('/app/profile')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/app/profile' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  EV TELEMETRY
                </button>
              </>
            )}

            {role === 'provider' && (
              <>
                <button
                  onClick={() => navigate('/provider/dashboard')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/provider/dashboard' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  RADAR JOBS
                </button>
                <button
                  onClick={() => navigate('/provider/history')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/provider/history' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  COMPLETED
                </button>
              </>
            )}

            {role === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/admin/dashboard' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  TELEMETRY
                </button>
                <button
                  onClick={() => navigate('/admin/requests')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/admin/requests' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  REQUESTS LEDGER
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/admin/users' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  DRIVERS
                </button>
                <button
                  onClick={() => navigate('/admin/providers')}
                  className={`transition-colors hover:text-white ${
                    currentPath === '/admin/providers' ? 'text-skyroot-accent font-bold' : 'text-neutral-400'
                  }`}
                >
                  FLEET UNITS
                </button>
              </>
            )}
          </nav>

          {/* Right Action Utilities */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Provider Online/Standby Switch */}
            {role === 'provider' && onToggleOnline && (
              <button
                onClick={onToggleOnline}
                className={`px-3 py-1 text-[10px] font-mono tracking-widest uppercase border transition-colors flex items-center space-x-2 ${
                  onlineStatus
                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                    : 'border-skyroot-border text-neutral-400 bg-skyroot-card'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    onlineStatus ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                  }`}
                ></span>
                <span>{onlineStatus ? 'ONLINE' : 'STANDBY'}</span>
              </button>
            )}

            <div className="text-right border-l border-skyroot-border pl-4">
              <span className="block text-[11px] font-medium text-white truncate max-w-[130px]">
                {user?.name || user?.email}
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-skyroot-muted">
                {role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-skyroot-card hover:bg-neutral-800 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-300 hover:text-white border border-skyroot-border transition-colors"
            >
              EXIT
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-neutral-400 hover:text-white focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-skyroot-border bg-skyroot-black px-4 py-4 space-y-3 font-mono text-xs uppercase tracking-widest">
          {role === 'user' && (
            <>
              <button
                onClick={() => {
                  navigate('/app/home');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                CONSOLE
              </button>
              <button
                onClick={() => {
                  navigate('/app/history');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                DISPATCH LOGS
              </button>
              <button
                onClick={() => {
                  navigate('/app/profile');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                EV TELEMETRY
              </button>
            </>
          )}

          {role === 'provider' && (
            <>
              <button
                onClick={() => {
                  navigate('/provider/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                RADAR JOBS
              </button>
              <button
                onClick={() => {
                  navigate('/provider/history');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                COMPLETED
              </button>
              {onToggleOnline && (
                <button
                  onClick={onToggleOnline}
                  className="block w-full text-left py-1 text-skyroot-accent"
                >
                  TOGGLE STATUS: {onlineStatus ? 'ONLINE' : 'STANDBY'}
                </button>
              )}
            </>
          )}

          {role === 'admin' && (
            <>
              <button
                onClick={() => {
                  navigate('/admin/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                TELEMETRY
              </button>
              <button
                onClick={() => {
                  navigate('/admin/requests');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                REQUESTS LEDGER
              </button>
              <button
                onClick={() => {
                  navigate('/admin/users');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                DRIVERS
              </button>
              <button
                onClick={() => {
                  navigate('/admin/providers');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-1 text-neutral-300"
              >
                FLEET UNITS
              </button>
            </>
          )}

          <div className="pt-2 border-t border-skyroot-border flex justify-between items-center">
            <span className="text-neutral-400">{user?.name}</span>
            <button onClick={handleLogout} className="text-skyroot-accent">
              LOGOUT
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
