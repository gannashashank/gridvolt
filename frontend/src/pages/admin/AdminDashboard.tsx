import React, { useEffect, useState } from 'react';
import SpecCard from '../../components/SpecCard';
import supabase from '../../lib/supabaseClient';

interface AdminDashboardProps {
  user: any;
  navigate: (path: string, params?: any) => void;
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
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('gv_token');
      // 1. Fetch metrics
      const metricsRes = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      // 2. Fetch requests
      const { data: reqs } = await supabase.from('assistance_requests').select('*');
      if (reqs) {
        const live = reqs.filter(
          (r: any) => !['completed', 'cancelled'].includes(r.status)
        );
        setActiveRequests(live);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen to realtime requests
    const subscription = supabase
      .channel('assistance_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistance_requests' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-skyroot-black text-white font-mono text-xs">
        <div className="w-8 h-8 border-2 border-skyroot-accent border-t-transparent animate-spin mb-4"></div>
        <span className="tracking-[0.2em] uppercase text-skyroot-muted">
          INITIALIZING CONTROL ROOM TELEMETRY...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Operational Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-skyroot-border gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase mb-1">
              <span className="w-2 h-2 bg-skyroot-accent"></span>
              <span>GRIDVOLT EXECUTIVE COMMAND</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Control Room Telemetry
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin/requests')}
              className="px-3.5 py-1.5 bg-skyroot-card border border-skyroot-border hover:border-white text-xs font-mono uppercase tracking-wider text-neutral-300"
            >
              LEDGER
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-3.5 py-1.5 bg-skyroot-card border border-skyroot-border hover:border-white text-xs font-mono uppercase tracking-wider text-neutral-300"
            >
              DRIVERS
            </button>
            <button
              onClick={() => navigate('/admin/providers')}
              className="px-3.5 py-1.5 bg-skyroot-card border border-skyroot-border hover:border-white text-xs font-mono uppercase tracking-wider text-neutral-300"
            >
              FLEET
            </button>
          </div>
        </div>

        {/* 1. Vikram-I Style Stat Spec Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SpecCard
            tag="MISSION DISPATCH STATUS"
            title="Active Dispatches"
            primaryStat={String(metrics.activeRequests)}
            primaryStatLabel="LIVE SOS SESSIONS"
            highlight={metrics.activeRequests > 0}
            bullets={[
              { label: 'Completed Missions', value: `${metrics.completedRequests} Fulfilled` },
              { label: 'Dispatch Protocol', value: 'Realtime Autopilot' },
              { label: 'Network Integrity', value: '100% Operational' },
            ]}
          />

          <SpecCard
            tag="FLEET TELEMETRY"
            title="Registered Fleet"
            primaryStat={String(metrics.providers)}
            primaryStatLabel="ACTIVE PROVIDERS"
            bullets={[
              { label: 'Verified EV Drivers', value: `${metrics.users} Accounts` },
              { label: 'Geofence Coverage', value: 'National India BBox' },
              { label: 'System Rating', value: `★ ${metrics.averageRating || '4.9'} / 5.0` },
            ]}
          />

          <SpecCard
            tag="FINANCIAL SETTLEMENT"
            title="Tariff Settlement"
            primaryStat={`₹${metrics.totalRevenue?.toLocaleString('en-IN') || '0'}`}
            primaryStatLabel="AGGREGATED SETTLED VOLUME"
            bullets={[
              { label: 'Standard Callout', value: '₹299.00 Flat' },
              { label: 'Kilometer Rate', value: '₹18.00 / km' },
              { label: 'Payment Method', value: 'Direct Verified' },
            ]}
          />
        </div>

        {/* 2. Active Live Dispatches Radar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono tracking-[0.2em] text-neutral-400 uppercase">
              LIVE SOS RADAR ({activeRequests.length} ACTIVE)
            </h2>
            <button
              onClick={() => navigate('/admin/requests')}
              className="text-[10px] font-mono uppercase tracking-wider text-skyroot-accent hover:underline"
            >
              VIEW COMPLETE LEDGER →
            </button>
          </div>

          <div className="skyroot-card overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-skyroot-border text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Dispatch ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Coordinates</th>
                  <th className="p-4">Carrier Assigned</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skyroot-border/60">
                {activeRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-skyroot-cardHover transition-colors">
                    <td className="p-4 text-skyroot-accent font-medium">{req.id}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider border border-skyroot-accent/40 bg-skyroot-accentMuted text-skyroot-accent">
                        {req.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-300">
                      {req.latitude?.toFixed(4)}° N, {req.longitude?.toFixed(4)}° E
                    </td>
                    <td className="p-4 text-neutral-300">
                      {req.provider_name || req.provider_id || 'Autopilot Matched'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate('/admin/requests', { focusId: req.id })}
                        className="px-3 py-1 bg-skyroot-black border border-skyroot-border hover:border-white text-[10px] uppercase text-white"
                      >
                        INSPECT TIMELINE
                      </button>
                    </td>
                  </tr>
                ))}
                {activeRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-500 uppercase tracking-wider">
                      All sectors calm. No active emergency distress calls.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
