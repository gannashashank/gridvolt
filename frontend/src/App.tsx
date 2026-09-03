import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import CompleteProfile from './pages/auth/CompleteProfile';

// Customer Portal
import CustomerHome from './pages/customer/CustomerHome';
import CustomerRequest from './pages/customer/CustomerRequest';
import CustomerHistory from './pages/customer/CustomerHistory';
import CustomerProfile from './pages/customer/CustomerProfile';

// Provider Portal
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderJob from './pages/provider/ProviderJob';
import ProviderHistory from './pages/provider/ProviderHistory';

// Admin Portal
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProviders from './pages/admin/AdminProviders';
import AdminRequests from './pages/admin/AdminRequests';

import supabase from './lib/supabaseClient';

export default function App() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname === '/' ? '/login' : window.location.pathname
  );
  const [routeParams, setRouteParams] = useState<any>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [providerOnline, setProviderOnline] = useState(true);

  // Sync state with browser URL
  const navigate = (path: string, params: any = {}) => {
    setRouteParams(params);
    setCurrentPath(path);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setSessionUser(data.session.user);
        await verifyAndRoute(data.session.user);
      } else {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (session?.user) {
          setSessionUser(session.user);
          await verifyAndRoute(session.user);
        } else {
          setSessionUser(null);
          setProfile(null);
          navigate('/login');
          setAuthLoading(false);
        }
      }
    );

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  const verifyAndRoute = async (user: any) => {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!prof) {
        setProfile(user);
        navigate('/complete-profile');
        setAuthLoading(false);
        return;
      }

      setProfile(prof);

      // Check onboarding completion
      const isComplete =
        prof.name &&
        prof.phone &&
        (prof.role === 'user' ? prof.ev_model : prof.vehicle_type);

      if (!isComplete) {
        navigate('/complete-profile');
      } else {
        // Enforce route guard on initial load or current path
        enforceRoleGuard(prof, window.location.pathname);
      }
    } catch (err) {
      console.error('Failed to verify profile status:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Strict Role Guard
  const enforceRoleGuard = (userProfile: any, targetPath: string) => {
    const role = userProfile?.role || 'user';
    const clean = (targetPath || '/').replace(/%20/g, '-').replace(/ /g, '-');

    // If on auth paths while logged in, redirect to respective role root
    if (['/login', '/signup', '/complete-profile', '/'].includes(clean)) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'provider') navigate('/provider/dashboard');
      else navigate('/app/home');
      return;
    }

    // Role boundary checks
    if (role === 'user' && !clean.startsWith('/app')) {
      navigate('/app/home');
    } else if (role === 'provider' && !clean.startsWith('/provider')) {
      navigate('/provider/dashboard');
    } else if (role === 'admin' && !clean.startsWith('/admin')) {
      navigate('/admin/dashboard');
    } else {
      setCurrentPath(clean);
    }
  };

  const toggleProviderOnline = async () => {
    const nextState = !providerOnline;
    setProviderOnline(nextState);
    if (profile?.id) {
      try {
        await supabase
          .from('providers')
          .update({ availability: nextState })
          .eq('profile_id', profile.id);
      } catch (err) {
        console.error('Failed to update availability state:', err);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-skyroot-black flex flex-col items-center justify-center font-mono text-xs text-white">
        <div className="w-8 h-8 border-2 border-skyroot-accent border-t-transparent animate-spin mb-4"></div>
        <span className="tracking-[0.25em] text-skyroot-muted uppercase">
          INITIALIZING GRIDVOLT SYSTEMS...
        </span>
      </div>
    );
  }

  // Render Page Content
  const renderCurrentView = () => {
    if (!sessionUser) {
      if (currentPath === '/signup') {
        return <Signup onSignupSuccess={setSessionUser} navigate={navigate} />;
      }
      return <Login onLoginSuccess={setSessionUser} navigate={navigate} />;
    }

    const cleanPath = currentPath.replace(/%20/g, '-').replace(/ /g, '-');
    const currentUser = profile || sessionUser;

    if (cleanPath === '/complete-profile') {
      return (
        <CompleteProfile
          user={currentUser}
          onComplete={() => verifyAndRoute(sessionUser)}
          navigate={navigate}
        />
      );
    }

    const role = currentUser?.role || 'user';

    // 1. Customer Portal (/app/...)
    if (role === 'user') {
      if (cleanPath.startsWith('/app/request/')) {
        const reqId = cleanPath.split('/app/request/')[1] || routeParams.requestId;
        return <CustomerRequest requestId={reqId} navigate={navigate} />;
      }
      if (cleanPath === '/app/history') {
        return <CustomerHistory user={currentUser} navigate={navigate} />;
      }
      if (cleanPath === '/app/profile') {
        return <CustomerProfile user={currentUser} navigate={navigate} />;
      }
      return <CustomerHome user={currentUser} navigate={navigate} />;
    }

    // 2. Provider Portal (/provider/...)
    if (role === 'provider') {
      if (cleanPath.startsWith('/provider/job/')) {
        const jobId = cleanPath.split('/provider/job/')[1] || routeParams.jobId;
        return <ProviderJob jobId={jobId} user={currentUser} navigate={navigate} />;
      }
      if (cleanPath === '/provider/history') {
        return <ProviderHistory user={currentUser} navigate={navigate} />;
      }
      return (
        <ProviderDashboard
          user={currentUser}
          navigate={navigate}
          online={providerOnline}
          onToggleOnline={toggleProviderOnline}
        />
      );
    }

    // 3. Admin Portal (/admin/...)
    if (role === 'admin') {
      if (cleanPath === '/admin/users') {
        return <AdminUsers user={currentUser} navigate={navigate} />;
      }
      if (cleanPath === '/admin/providers') {
        return <AdminProviders user={currentUser} navigate={navigate} />;
      }
      if (cleanPath === '/admin/requests') {
        return (
          <AdminRequests
            user={currentUser}
            navigate={navigate}
            initialFocusId={routeParams.focusId}
          />
        );
      }
      return <AdminDashboard user={currentUser} navigate={navigate} />;
    }

    return <CustomerHome user={currentUser} navigate={navigate} />;
  };

  const showNavbar = sessionUser && currentPath !== '/complete-profile';

  return (
    <div className="min-h-screen bg-skyroot-black flex flex-col font-sans selection:bg-skyroot-accent selection:text-white">
      {showNavbar && (
        <Navbar
          user={profile || sessionUser}
          currentPath={currentPath}
          navigate={navigate}
          onlineStatus={providerOnline}
          onToggleOnline={toggleProviderOnline}
        />
      )}

      <main className="flex-1">{renderCurrentView()}</main>

      {showNavbar && (
        <footer className="py-6 border-t border-skyroot-border bg-skyroot-black text-center font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
          GRIDVOLT RESCUE SYSTEMS // GEOFENCED INDIA BOUNDS // SPEC 2026
        </footer>
      )}
    </div>
  );
}
