import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CompleteProfile from './pages/CompleteProfile';
import Home from './pages/Home';
import RequestDetails from './pages/RequestDetails';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';
import supabase from './lib/supabaseClient';

export default function App() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<string>('login');
  const [routeParams, setRouteParams] = useState<any>({});
  const [authLoading, setAuthLoading] = useState(true);

  // Sync auth session state
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setSessionUser(data.session.user);
        await checkProfileCompletion(data.session.user);
      } else {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        setSessionUser(session.user);
        await checkProfileCompletion(session.user);
      } else {
        setSessionUser(null);
        setProfile(null);
        setCurrentPage('login');
        setAuthLoading(false);
      }
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const checkProfileCompletion = async (user: any) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !prof) {
        // Redirect to profile completion
        setProfile(user);
        setCurrentPage('complete-profile');
        return;
      }

      setProfile(prof);

      // Check if profile fields are complete
      const isComplete =
        prof.name &&
        prof.phone &&
        (prof.role === 'user' ? prof.ev_model : prof.vehicle_type);

      if (!isComplete) {
        setCurrentPage('complete-profile');
      } else {
        // Route according to user role
        if (prof.role === 'admin') {
          setCurrentPage('admin');
        } else if (prof.role === 'provider') {
          setCurrentPage('provider');
        } else {
          setCurrentPage('home');
        }
      }
    } catch (err) {
      console.error('Failed to sync profile status:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const navigate = (page: string, params: any = {}) => {
    setRouteParams(params);
    setCurrentPage(page);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-2 border-t-cyan-400 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4 tracking-widest font-mono">Initializing GridVolt...</p>
      </div>
    );
  }

  // Render correct page based on route guards
  const renderPage = () => {
    if (!sessionUser) {
      if (currentPage === 'signup') {
        return <Signup onSignupSuccess={setSessionUser} navigate={navigate} />;
      }
      return <Login onLoginSuccess={setSessionUser} navigate={navigate} />;
    }

    switch (currentPage) {
      case 'complete-profile':
        return (
          <CompleteProfile
            user={profile || sessionUser}
            onComplete={() => checkProfileCompletion(sessionUser)}
            navigate={navigate}
          />
        );
      case 'home':
        return <Home user={profile} navigate={navigate} />;
      case 'request':
        return <RequestDetails requestId={routeParams.requestId} navigate={navigate} />;
      case 'provider':
        return <ProviderDashboard user={profile} navigate={navigate} />;
      case 'admin':
        return <AdminDashboard user={profile} navigate={navigate} />;
      case 'history':
        return <History user={profile} navigate={navigate} />;
      default:
        return <Home user={profile} navigate={navigate} />;
    }
  };

  // Header Nav Bar (shown when logged in on customer/user screens)
  const showHeader = sessionUser && ['home', 'history', 'request'].includes(currentPage);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {showHeader && (
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-[1000] px-4 py-3">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button onClick={() => navigate('home')} className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span className="font-black tracking-wider text-sm text-cyan-400">GRIDVOLT</span>
            </button>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                Driver Mode • <span className="text-cyan-400 font-semibold">{profile?.name}</span>
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('login');
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-bold tracking-wide uppercase px-2 py-1 bg-slate-900 border border-slate-800 rounded transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {renderPage()}
      </main>

      <footer className="py-6 border-t border-slate-900/60 bg-slate-950 text-center text-[10px] text-slate-600">
        &copy; {new Date().getFullYear()} GridVolt. Operating exclusively in India bounds.
      </footer>
    </div>
  );
}
