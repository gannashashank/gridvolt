import React, { useEffect, useState } from 'react';
import IndiaMap from '../components/IndiaMap';
import supabase from '../lib/supabaseClient';

interface ProviderDashboardProps {
  user: any;
  navigate: (page: string) => void;
}

export default function ProviderDashboard({ user, navigate }: ProviderDashboardProps) {
  const [provider, setProvider] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simTimer, setSimTimer] = useState<any>(null);

  // Fetch provider record and active jobs
  const loadProviderData = async () => {
    try {
      // Get provider details
      const { data: list, error: provErr } = await supabase.from('providers').select('*');
      if (provErr) throw provErr;

      const currentProvider = list.find((p: any) => p.profile_id === user.id);
      if (currentProvider) {
        setProvider(currentProvider);
        setOnline(currentProvider.availability === 1 || currentProvider.availability === true);
      }

      // Get assigned assistance requests
      const { data: reqs, error: reqsErr } = await supabase.from('assistance_requests').select('*');
      if (reqsErr) throw reqsErr;

      const active = reqs.filter((r: any) =>
        r.provider_id === user.id && !['completed', 'cancelled'].includes(r.status)
      );
      setActiveJobs(active);
    } catch (err: any) {
      console.error('Error fetching provider dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();

    // Real-time listener for incoming dispatch tasks
    const subscription = supabase
      .channel('assistance_requests')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assistance_requests' },
        (payload: any) => {
          if (payload.new && payload.new.provider_id === user.id) {
            loadProviderData();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'assistance_requests' },
        (payload: any) => {
          if (payload.new && payload.new.provider_id === user.id) {
            loadProviderData();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (simTimer) clearInterval(simTimer);
    };
  }, [user.id]);

  const toggleOnline = async () => {
    const nextState = !online;
    setOnline(nextState);
    try {
      await supabase
        .from('providers')
        .update({ availability: nextState })
        .eq('profile_id', user.id);
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  const updateJobStatus = async (jobId: string, nextStatus: string) => {
    try {
      await supabase
        .from('assistance_requests')
        .update({ status: nextStatus })
        .eq('id', jobId);

      loadProviderData();
    } catch (err) {
      console.error('Failed to update job status', err);
    }
  };

  // Simulate routing move: interpolates provider coordinates towards user breakdown location
  const startRouteSimulation = (job: any) => {
    if (simulating) return;
    setSimulating(true);

    let step = 0;
    const totalSteps = 10;
    const startLat = provider?.latitude || 24.5854;
    const startLng = provider?.longitude || 73.7125;
    const destLat = job.latitude;
    const destLng = job.longitude;

    updateJobStatus(job.id, 'en_route');

    const timer = setInterval(async () => {
      step++;
      const ratio = step / totalSteps;
      const curLat = startLat + (destLat - startLat) * ratio;
      const curLng = startLng + (destLng - startLng) * ratio;

      // Update provider location on server
      await supabase
        .from('providers')
        .update({ latitude: curLat, longitude: curLng })
        .eq('profile_id', user.id);

      // Locally update state so map reflects moving marker
      setProvider((prev: any) => ({
        ...prev,
        latitude: curLat,
        longitude: curLng,
      }));

      if (step >= totalSteps) {
        clearInterval(timer);
        setSimulating(false);
        // Advance job state to arrived
        updateJobStatus(job.id, 'arrived');
      }
    }, 1500); // update coordinate every 1.5 seconds

    setSimTimer(timer);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4">Syncing Fleet Telemetry...</p>
      </div>
    );
  }

  const activeJob = activeJobs[0]; // Focus on primary active job

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-emerald-400">GRIDVOLT PROVIDER</h1>
          <p className="text-xs text-slate-400">Operator Console: {user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleOnline}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${online ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
            {online ? 'Online & Available' : 'Offline / Busy'}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-900/60 hover:bg-slate-850 px-3 py-2 rounded-lg border border-slate-800 text-slate-450 hover:text-slate-300 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Live map tracking */}
        <div className="lg:col-span-8">
          <div className="h-[450px] relative rounded-xl overflow-hidden border border-slate-800">
            <IndiaMap
              userLat={activeJob ? activeJob.latitude : (provider?.latitude || 24.5854)}
              userLng={activeJob ? activeJob.longitude : (provider?.longitude || 73.7125)}
              providerLat={provider?.latitude}
              providerLng={provider?.longitude}
              providerName={user?.name}
            />
          </div>
        </div>

        {/* Right column: Action panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Assigned Task</h3>

            {activeJob ? (
              <div className="space-y-6">
                <div>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {activeJob.status.replace('_', ' ')}
                  </span>
                  <h4 className="text-lg font-bold text-white mt-3">EV Recovery Dispatch</h4>
                  <p className="text-xs text-slate-400 mt-1">Requested breakdown point matched to you.</p>
                </div>

                <div className="space-y-2.5 border-y border-slate-900 py-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Task ID:</span>
                    <span className="text-slate-200">{activeJob.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination coordinates:</span>
                    <span className="text-slate-205 text-[11px]">
                      {activeJob.latitude.toFixed(5)}, {activeJob.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Workflow Controls */}
                <div className="space-y-3">
                  {activeJob.status === 'requested' && (
                    <button
                      onClick={() => updateJobStatus(activeJob.id, 'accepted')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      Acknowledge & Accept Job
                    </button>
                  )}

                  {activeJob.status === 'accepted' && (
                    <button
                      onClick={() => startRouteSimulation(activeJob)}
                      disabled={simulating}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                    >
                      🚀 Start Navigation (Simulate Route)
                    </button>
                  )}

                  {activeJob.status === 'en_route' && (
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-center">
                        <div className="w-4 h-4 border border-t-cyan-500 rounded-full animate-spin inline-block mr-2"></div>
                        <span className="text-xs font-bold text-cyan-400">Simulation in progress...</span>
                      </div>
                      <button
                        onClick={() => updateJobStatus(activeJob.id, 'arrived')}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition"
                      >
                        Force Mark Arrived
                      </button>
                    </div>
                  )}

                  {activeJob.status === 'arrived' && (
                    <button
                      onClick={() => updateJobStatus(activeJob.id, 'servicing')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition animate-pulse"
                    >
                      🛠 Start EV Fast Charging
                    </button>
                  )}

                  {activeJob.status === 'servicing' && (
                    <button
                      onClick={() => updateJobStatus(activeJob.id, 'completed')}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-650 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      ✓ Complete Assistance Task
                    </button>
                  )}

                  {activeJob.status !== 'completed' && (
                    <button
                      onClick={() => updateJobStatus(activeJob.id, 'cancelled')}
                      className="w-full py-2.5 bg-slate-950 border border-slate-850 text-rose-500 hover:bg-slate-900 rounded-lg text-xs transition"
                    >
                      Reject/Abort Job
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <span className="text-4xl block mb-2">😴</span>
                <span className="text-xs">No active dispatches. You are on standby.</span>
              </div>
            )}
          </div>

          {/* Provider Stats */}
          <div className="glass-panel p-6 rounded-xl text-xs space-y-3">
            <h4 className="font-bold text-white mb-2 uppercase tracking-wide text-slate-450">Telemetry Readings</h4>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Position:</span>
              <span className="font-mono text-slate-350">
                {provider?.latitude?.toFixed(4)}, {provider?.longitude?.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Grid Region:</span>
              <span className="text-slate-350">Udaipur Highway Zone 1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Charger Payload:</span>
              <span className="text-emerald-450 font-bold">120 kW Mobile CCS2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
