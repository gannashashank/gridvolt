import React, { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

interface AdminDashboardProps {
  user: any;
  navigate: (page: string, params?: any) => void;
}

export default function AdminDashboard({ user, navigate }: AdminDashboardProps) {
  const [metrics, setMetrics] = useState<any>({
    users: 0,
    providers: 0,
    activeRequests: 0,
    completedRequests: 0,
    averageRating: 0,
    totalRevenue: 0,
  });
  const [profiles, setProfiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      // 1. Fetch metrics from Express endpoint
      const token = localStorage.getItem('gv_token');
      const metricsRes = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // 2. Fetch profiles
      const { data: profData, error: profErr } = await supabase.from('profiles').select('*');
      if (profErr) throw profErr;
      setProfiles(profData || []);

      // 3. Fetch active requests
      const { data: reqData, error: reqErr } = await supabase.from('assistance_requests').select('*');
      if (reqErr) throw reqErr;
      setRequests(reqData || []);

      // 4. Fetch service records
      const recsRes = await fetch('/api/service-records', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecords(recsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4">Retrieving System Logs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-cyan-400">GRIDVOLT CONTROL CENTER</h1>
          <p className="text-xs text-slate-400">System Administrator Control Room</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-900/60 hover:bg-slate-850 px-3 py-2 rounded-lg border border-slate-800 text-slate-350 hover:text-slate-200 transition"
        >
          Logout Admin Session
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
          <div className="text-2xl font-black text-white mt-1">{metrics.users}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Providers</span>
          <div className="text-2xl font-black text-cyan-400 mt-1">{metrics.providers}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Active SOS</span>
          <div className="text-2xl font-black text-rose-400 mt-1 animate-pulse">{metrics.activeRequests}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Completed</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.completedRequests}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">System Rating</span>
          <div className="text-2xl font-black text-yellow-400 mt-1">★ {metrics.averageRating}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400">Settle Cost</span>
          <div className="text-2xl font-black text-emerald-450 mt-1 font-mono">₹{metrics.totalRevenue}</div>
        </div>
      </div>

      {/* Tables Row 1: Active Requests & User Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Active Requests */}
        <div className="glass-panel p-6 rounded-xl flex flex-col h-[320px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex justify-between">
            <span>Live Dispatch Monitor</span>
            <span className="text-rose-450 font-mono animate-pulse">• LIVE</span>
          </h3>
          <div className="overflow-y-auto flex-1 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 pb-2">
                  <th className="pb-2">Request ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Coordinates</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {requests
                  .filter((r) => !['completed', 'cancelled'].includes(r.status))
                  .map((req) => (
                    <tr key={req.id}>
                      <td className="py-2.5 font-mono text-cyan-400">{req.id}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-350 capitalize text-[9px] border border-slate-800">
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[10px]">
                        {req.latitude?.toFixed(4)}, {req.longitude?.toFixed(4)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => navigate('request', { requestId: req.id })}
                          className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-[10px] border border-cyan-500/20"
                        >
                          Locate
                        </button>
                      </td>
                    </tr>
                  ))}
                {requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No active emergency requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User profiles */}
        <div className="glass-panel p-6 rounded-xl flex flex-col h-[320px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">User & Provider Accounts</h3>
          <div className="overflow-y-auto flex-1 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 pb-2">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Vehicle Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="py-2.5 text-slate-200">{profile.name}</td>
                    <td className="py-2.5 font-mono text-slate-400">{profile.phone}</td>
                    <td className="py-2.5 capitalize">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${profile.role === 'provider' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : profile.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-900 text-slate-400'}`}>
                        {profile.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-350 text-[10px] truncate max-w-[150px]">
                      {profile.role === 'provider'
                        ? `${profile.vehicle_type || 'N/A'} - ${profile.service_capability || 'N/A'}`
                        : `${profile.ev_model || 'N/A'} [${profile.license_plate || 'N/A'}]`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Completed Service Logs */}
      <div className="glass-panel p-6 rounded-xl flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Completed Service Logs</h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 pb-2">
                <th className="pb-2">Record ID</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Rescuer</th>
                <th className="pb-2">Final Cost</th>
                <th className="pb-2">Rating</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td className="py-2.5 font-mono text-slate-450">{rec.id}</td>
                  <td className="py-2.5 font-semibold text-slate-205">{rec.user_name}</td>
                  <td className="py-2.5 text-slate-300">{rec.provider_name}</td>
                  <td className="py-2.5 font-mono text-emerald-400">₹{rec.final_cost}</td>
                  <td className="py-2.5 text-yellow-400">
                    {'★'.repeat(rec.rating || 0)}
                    {'☆'.repeat(5 - (rec.rating || 0))}
                  </td>
                  <td className="py-2.5 text-slate-400 truncate max-w-[200px]" title={rec.notes}>
                    {rec.notes || '—'}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No historical logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
