import React, { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface ProviderDashboardProps {
  user: any;
  navigate: (path: string, params?: any) => void;
  online: boolean;
  onToggleOnline: () => void;
}

export default function ProviderDashboard({
  user,
  navigate,
  online,
  onToggleOnline,
}: ProviderDashboardProps) {
  const [provider, setProvider] = useState<any>(null);
  const [assignedJobs, setAssignedJobs] = useState<any[]>([]);
  const [incomingJobs, setIncomingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviderData = async () => {
    try {
      // 1. Get provider record
      const { data: provList } = await supabase.from('providers').select('*');
      if (provList) {
        const me = provList.find((p: any) => p.profile_id === user.id);
        if (me) setProvider(me);
      }

      // 2. Get assistance requests
      const { data: allReqs } = await supabase.from('assistance_requests').select('*');
      if (allReqs) {
        // Active assigned jobs
        const active = allReqs.filter(
          (r: any) =>
            r.provider_id === user.id && !['completed', 'cancelled'].includes(r.status)
        );
        setAssignedJobs(active);

        // Incoming / requested jobs
        const pending = allReqs.filter(
          (r: any) => r.provider_id === user.id && r.status === 'requested'
        );
        setIncomingJobs(pending);
      }
    } catch (err) {
      console.error('Error fetching provider dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();

    // Listen to real-time dispatches
    const subscription = supabase
      .channel('assistance_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assistance_requests' },
        (payload: any) => {
          if (payload.new && payload.new.provider_id === user.id) {
            loadProviderData();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id]);

  const handleAcceptJob = async (jobId: string) => {
    try {
      await supabase
        .from('assistance_requests')
        .update({ status: 'accepted' })
        .eq('id', jobId);

      navigate(`/provider/job/${jobId}`, { jobId });
    } catch (err) {
      alert('Failed to accept job dispatch.');
    }
  };

  const handleDeclineJob = async (jobId: string) => {
    try {
      await supabase
        .from('assistance_requests')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      await loadProviderData();
    } catch (err) {
      alert('Failed to decline job.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-skyroot-black text-white font-mono text-xs">
        <div className="w-8 h-8 border-2 border-skyroot-accent border-t-transparent animate-spin mb-4"></div>
        <span className="tracking-[0.2em] uppercase text-skyroot-muted">
          SCANNING FLEET RADAR...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Telemetry Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-skyroot-border gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase mb-1">
              <span className="w-2 h-2 bg-skyroot-accent"></span>
              <span>PROVIDER DISPATCH TERMINAL</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Operational Fleet Cockpit
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleOnline}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-all flex items-center space-x-2 ${
                online
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                  : 'border-skyroot-border bg-skyroot-card text-neutral-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  online ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                }`}
              ></span>
              <span>{online ? 'FLEET ONLINE & BROADCASTING' : 'FLEET STANDBY (OFFLINE)'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="skyroot-card p-4">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              CARRIER UNIT
            </span>
            <span className="text-lg font-mono text-white mt-1 block uppercase">
              {user?.vehicle_type || 'Service Van'}
            </span>
          </div>

          <div className="skyroot-card p-4">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              REGISTRATION
            </span>
            <span className="text-lg font-mono text-white mt-1 block uppercase">
              {user?.license_plate || 'RJ27UA1111'}
            </span>
          </div>

          <div className="skyroot-card p-4">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              ACTIVE DISPATCHES
            </span>
            <span className="text-lg font-mono text-skyroot-accent mt-1 block">
              {assignedJobs.length} ONGOING
            </span>
          </div>

          <div className="skyroot-card p-4">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              RADAR FIX
            </span>
            <span className="text-lg font-mono text-emerald-400 mt-1 block">
              {provider?.latitude?.toFixed(4)}°, {provider?.longitude?.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Ongoing Dispatches (In Progress) */}
        {assignedJobs.filter((j) => j.status !== 'requested').length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-mono tracking-[0.2em] text-skyroot-accent uppercase mb-4">
              [CRITICAL] CURRENT ACTIVE ASSIGNMENTS
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {assignedJobs
                .filter((j) => j.status !== 'requested')
                .map((job) => (
                  <div
                    key={job.id}
                    className="skyroot-card p-6 border-skyroot-accent/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 bg-skyroot-accent text-white font-bold">
                          {job.status?.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          JOB REF #{job.id}
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white uppercase mt-2">
                        {job.user_name ? `${job.user_name}'s EV Rescue` : 'EV Emergency Assistance'}
                      </h3>
                      <p className="text-xs font-mono text-neutral-400 mt-1">
                        DESTINATION COORDINATE: {job.latitude?.toFixed(4)}° N, {job.longitude?.toFixed(4)}° E
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/provider/job/${job.id}`, { jobId: job.id })}
                      className="px-6 py-3 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-bold transition-all"
                    >
                      OPEN ACTIVE COCKPIT →
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Incoming Job Queue */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-mono tracking-[0.2em] text-neutral-400 uppercase">
              RADAR JOB DISPATCH QUEUE ({incomingJobs.length})
            </h2>
            <button
              onClick={loadProviderData}
              className="text-[10px] font-mono uppercase tracking-wider text-skyroot-accent hover:underline"
            >
              REFRESH RADAR
            </button>
          </div>

          {incomingJobs.length === 0 ? (
            <div className="skyroot-card p-12 text-center">
              <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest block mb-2">
                STANDBY • ALL RADAR SECTORS CLEAR
              </span>
              <p className="text-sm text-neutral-400 font-light">
                {online
                  ? 'Your unit is currently online. Incoming roadside emergency matches will appear here automatically.'
                  : 'Your unit is currently set to STANDBY. Toggle online above to receive rescue matches.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {incomingJobs.map((job) => (
                <div key={job.id} className="skyroot-card p-6 border-skyroot-accent/40">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-skyroot-accent block mb-1">
                        INCOMING SOS CALLOUT
                      </span>
                      <h3 className="text-lg font-light text-white uppercase">
                        Emergency EV Dispatch
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-skyroot-accentMuted border border-skyroot-accent text-skyroot-accent">
                      MATCHED
                    </span>
                  </div>

                  <div className="space-y-2.5 py-4 border-y border-skyroot-border text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 uppercase tracking-wider">Dispatched Call</span>
                      <span className="text-white">REF #{job.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400 uppercase tracking-wider">Breakdown Fix</span>
                      <span className="text-white">
                        {job.latitude?.toFixed(4)}° N, {job.longitude?.toFixed(4)}° E
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400 uppercase tracking-wider">Offered Fee</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{job.estimated_cost || '392.60'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="py-2.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-bold transition-all"
                    >
                      ACCEPT DISPATCH
                    </button>
                    <button
                      onClick={() => handleDeclineJob(job.id)}
                      className="py-2.5 bg-skyroot-black border border-skyroot-border hover:border-neutral-500 text-neutral-400 font-mono text-xs uppercase tracking-wider transition-all"
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
