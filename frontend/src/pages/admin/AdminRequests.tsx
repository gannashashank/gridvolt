import React, { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface AdminRequestsProps {
  user: any;
  navigate: (path: string) => void;
  initialFocusId?: string;
}

export default function AdminRequests({ user, navigate, initialFocusId }: AdminRequestsProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const { data } = await supabase.from('assistance_requests').select('*');
      if (data) setRequests(data);
    } catch (err) {
      console.error('Failed to load requests ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    if (initialFocusId) {
      inspectTimeline(initialFocusId);
    }

    const subscription = supabase
      .channel('assistance_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistance_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialFocusId]);

  const inspectTimeline = async (reqId: string) => {
    const target = requests.find((r) => r.id === reqId);
    setSelectedRequest(target || { id: reqId });
    setLoadingEvents(true);

    try {
      const token = localStorage.getItem('gv_token');
      const res = await fetch(`/api/requests/${reqId}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Failed to query timeline events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return !['completed', 'cancelled'].includes(r.status);
    return r.status === filterStatus;
  });

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-skyroot-border gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase mb-1">
              <span className="w-2 h-2 bg-skyroot-accent"></span>
              <span>COMPLETE AUDIT REPOSITORY</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Emergency Requests Ledger
            </h1>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
            {['all', 'active', 'requested', 'en_route', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 border transition-all ${
                  filterStatus === st
                    ? 'border-skyroot-accent bg-skyroot-accent text-white font-bold'
                    : 'border-skyroot-border bg-skyroot-card text-neutral-400 hover:border-neutral-500'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-skyroot-muted">
            SYNCHRONIZING DISPATCH REPOSITORY...
          </div>
        ) : (
          <div className="skyroot-card overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-skyroot-border text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Dispatch ID</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">On-Site Recipient</th>
                  <th className="p-4">Requester</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Coordinates</th>
                  <th className="p-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skyroot-border/60">
                {filtered.map((req) => {
                  const isRemote = req.is_for_self === 0 || req.is_for_self === false;
                  return (
                    <tr key={req.id} className="hover:bg-skyroot-cardHover transition-colors">
                      <td className="p-4 text-skyroot-accent font-medium">{req.id}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-wider border ${
                            isRemote
                              ? 'border-skyroot-accent bg-skyroot-accentMuted text-skyroot-accent'
                              : 'border-neutral-700 bg-skyroot-surface text-neutral-400'
                          }`}
                        >
                          {isRemote ? 'REMOTE' : 'SELF'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-wider border ${
                            req.status === 'completed'
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : req.status === 'cancelled'
                              ? 'border-red-500/50 bg-red-950/20 text-red-400'
                              : 'border-skyroot-accent/60 bg-skyroot-accentMuted text-skyroot-accent'
                          }`}
                        >
                          {req.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-white">
                        <span className="block font-medium">{req.onsite_contact_name || req.user_name || 'Driver'}</span>
                        <span className="text-[10px] text-emerald-400 block">{req.onsite_contact_phone || req.user_phone || '—'}</span>
                      </td>
                      <td className="p-4 text-neutral-300">
                        <span className="block">{req.user_name || req.user_id}</span>
                        <span className="text-[10px] text-neutral-500 block">{req.user_phone}</span>
                      </td>
                      <td className="p-4 text-neutral-300">
                        {req.provider_name || req.provider_id || 'Autopilot Matched'}
                      </td>
                      <td className="p-4 text-neutral-300">
                        {req.latitude?.toFixed(4)}° N, {req.longitude?.toFixed(4)}° E
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => inspectTimeline(req.id)}
                          className="px-3 py-1 bg-skyroot-black border border-skyroot-border hover:border-white text-[10px] uppercase text-white transition-colors"
                        >
                          TIMELINE →
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-500 uppercase tracking-wider">
                      No matching dispatches found under filter: {filterStatus}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timeline Drilldown Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-skyroot-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl skyroot-card p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-skyroot-border mb-4">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-skyroot-accent uppercase block">
                  EVENT TIMELINE DRILLDOWN
                </span>
                <h3 className="text-lg font-light text-white uppercase mt-0.5">
                  Dispatch #{selectedRequest.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-neutral-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {/* Request Summary Strip */}
            <div className="mb-4 p-3 bg-skyroot-surface border border-skyroot-border text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[9px] text-neutral-500 uppercase block">Scope</span>
                <span className="text-skyroot-accent font-bold">
                  {selectedRequest.is_for_self === 0 || selectedRequest.is_for_self === false ? 'REMOTE ASSISTANCE' : 'DIRECT SELF'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 uppercase block">On-Site Contact</span>
                <span className="text-white truncate block">
                  {selectedRequest.onsite_contact_name || selectedRequest.user_name || '—'}
                </span>
                <span className="text-[10px] text-emerald-400">
                  {selectedRequest.onsite_contact_phone || selectedRequest.user_phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 uppercase block">Target Fix</span>
                <span className="text-neutral-300">
                  {selectedRequest.latitude?.toFixed(4)}°, {selectedRequest.longitude?.toFixed(4)}°
                </span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 uppercase block">Assigned Unit</span>
                <span className="text-neutral-300 truncate block">
                  {selectedRequest.provider_name || selectedRequest.provider_id || 'Autopilot'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {loadingEvents ? (
                <div className="py-12 text-center font-mono text-xs text-skyroot-muted">
                  LOADING AUDIT EVENTS...
                </div>
              ) : events.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-500">
                  No chronological events logged yet for this request.
                </div>
              ) : (
                <div className="relative pl-6 border-l border-skyroot-border space-y-6">
                  {events.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 bg-skyroot-accent border-2 border-skyroot-black"></span>

                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-white font-mono uppercase">
                          STATUS: {evt.status?.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-neutral-400 mt-1">
                        Triggered by: {evt.actor_name || evt.actor_id || 'System Engine'} ({evt.actor_role || 'system'})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-skyroot-border flex justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2 bg-skyroot-card border border-skyroot-border text-xs font-mono uppercase tracking-wider text-white hover:border-white"
              >
                CLOSE INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
