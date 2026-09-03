import React, { useEffect, useState } from 'react';
import IndiaMap from '../../components/IndiaMap';
import HorizontalStepper from '../../components/HorizontalStepper';
import supabase from '../../lib/supabaseClient';

interface ProviderJobProps {
  jobId: string;
  user: any;
  navigate: (path: string, params?: any) => void;
}

export default function ProviderJob({ jobId, user, navigate }: ProviderJobProps) {
  const [job, setJob] = useState<any>(null);
  const [providerLoc, setProviderLoc] = useState<any>({ latitude: 24.5854, longitude: 73.7125 });
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simTimer, setSimTimer] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [finalCost, setFinalCost] = useState('392.60');
  const [completing, setCompleting] = useState(false);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('assistance_requests')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        setJob(data);
        if (data.quote?.estimated_cost) {
          setFinalCost(String(data.quote.estimated_cost));
        }
      }

      // Fetch provider coordinates
      const { data: provList } = await supabase.from('providers').select('*');
      if (provList) {
        const me = provList.find((p: any) => p.profile_id === user.id);
        if (me) {
          setProviderLoc({ latitude: me.latitude, longitude: me.longitude });
        }
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();

    return () => {
      if (simTimer) clearInterval(simTimer);
    };
  }, [jobId]);

  const updateStatus = async (newStatus: string) => {
    try {
      await supabase
        .from('assistance_requests')
        .update({ status: newStatus })
        .eq('id', jobId);

      setJob((prev: any) => ({ ...prev, status: newStatus }));
      await fetchJobDetails();
    } catch (err) {
      alert('Failed to update job status.');
    }
  };

  const startRouteSimulation = () => {
    if (simulating || !job) return;
    setSimulating(true);

    let step = 0;
    const totalSteps = 8;
    const startLat = providerLoc.latitude || 24.5854;
    const startLng = providerLoc.longitude || 73.7125;
    const targetLat = job.latitude;
    const targetLng = job.longitude;

    updateStatus('en_route');

    const timer = setInterval(async () => {
      step++;
      const ratio = step / totalSteps;
      const curLat = startLat + (targetLat - startLat) * ratio;
      const curLng = startLng + (targetLng - startLng) * ratio;

      // Update provider coordinates on server
      await supabase
        .from('providers')
        .update({ latitude: curLat, longitude: curLng })
        .eq('profile_id', user.id);

      setProviderLoc({ latitude: curLat, longitude: curLng });

      if (step >= totalSteps) {
        clearInterval(timer);
        setSimulating(false);
        updateStatus('arrived');
      }
    }, 1500);

    setSimTimer(timer);
  };

  const handleCompleteMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleting(true);
    try {
      const res = await fetch('/api/service-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gv_token')}`,
        },
        body: JSON.stringify({
          request_id: jobId,
          service_type: user?.service_capability || 'EV Charging Rescue',
          final_cost: parseFloat(finalCost) || 392.6,
          notes: notes || 'Service completed successfully.',
          rating: 5,
        }),
      });

      if (!res.ok) throw new Error('Settlement failed');
      navigate('/provider/history');
    } catch (err: any) {
      alert(err.message || 'Error finalizing service record.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-skyroot-black text-white font-mono text-xs">
        <div className="w-8 h-8 border-2 border-skyroot-accent border-t-transparent animate-spin mb-4"></div>
        <span className="tracking-[0.2em] uppercase text-skyroot-muted">
          SYNCHRONIZING DISPATCH COCKPIT...
        </span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 skyroot-card text-center">
        <span className="text-red-500 font-mono text-xs block mb-2">[ERROR]</span>
        <p className="text-neutral-300 text-sm mb-6">Target assignment record not found.</p>
        <button
          onClick={() => navigate('/provider/dashboard')}
          className="px-4 py-2 bg-skyroot-card border border-skyroot-border text-white text-xs font-mono uppercase tracking-wider"
        >
          RETURN TO RADAR
        </button>
      </div>
    );
  }

  const status = job.status;

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-skyroot-border">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/provider/dashboard')}
              className="text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider"
            >
              ← RADAR DASHBOARD
            </button>
            <span className="text-neutral-600 font-mono text-xs">/</span>
            <span className="text-xs font-mono text-skyroot-accent uppercase tracking-widest">
              MISSION #{job.id}
            </span>
          </div>

          <span className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest border border-skyroot-accent text-skyroot-accent bg-skyroot-accentMuted">
            STAGE: {status?.replace('_', ' ')}
          </span>
        </div>

        {/* Horizontal Status Progression */}
        <div className="mb-8 skyroot-card p-6">
          <HorizontalStepper currentStatus={status} />
        </div>

        {/* Main Operational Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="h-[500px] border border-skyroot-border relative overflow-hidden">
              <IndiaMap
                userLat={job.latitude}
                userLng={job.longitude}
                providerLat={providerLoc.latitude}
                providerLng={providerLoc.longitude}
                providerName={user?.name}
              />
            </div>

            <div className="skyroot-card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono gap-2">
              <span className="text-neutral-400">
                DESTINATION: {job.latitude?.toFixed(4)}° N, {job.longitude?.toFixed(4)}° E
              </span>
              <span className="text-skyroot-accent">
                PROVIDER RADAR: {providerLoc.latitude?.toFixed(4)}° N, {providerLoc.longitude?.toFixed(4)}° E
              </span>
            </div>
          </div>

          {/* Operational Controls & Stage Transition Cockpit */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="skyroot-card p-6 border-skyroot-accent/40">
              <span className="text-[10px] font-mono tracking-[0.2em] text-skyroot-accent uppercase block mb-1">
                DISPATCH CONTROLLER
              </span>
              <h3 className="text-lg font-light text-white uppercase mb-4">
                Execute Mission Stage
              </h3>

              <div className="space-y-3">
                {/* 1. Accepted Stage: Start Route Navigation */}
                {status === 'accepted' && (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-400 font-light">
                      Assignment confirmed. Start route transit or simulate movement along the highway corridor.
                    </p>
                    <button
                      onClick={startRouteSimulation}
                      disabled={simulating}
                      className="w-full py-3.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <span>▶ SIMULATE ROUTE TRANSIT</span>
                    </button>
                    <button
                      onClick={() => updateStatus('en_route')}
                      className="w-full py-2.5 bg-skyroot-black border border-skyroot-border hover:border-neutral-500 text-neutral-400 font-mono text-xs uppercase tracking-wider"
                    >
                      MANUAL MARK: EN ROUTE
                    </button>
                  </div>
                )}

                {/* 2. En Route Stage */}
                {status === 'en_route' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-skyroot-black border border-skyroot-border text-center font-mono text-xs">
                      {simulating ? (
                        <div className="text-skyroot-accent flex items-center justify-center space-x-2">
                          <span className="w-2 h-2 bg-skyroot-accent animate-ping"></span>
                          <span>TRANSIT TELEMETRY STREAMING...</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">EN ROUTE TO BREAKDOWN COORDINATE</span>
                      )}
                    </div>
                    <button
                      onClick={() => updateStatus('arrived')}
                      className="w-full py-3.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold"
                    >
                      MARK ON-SITE ARRIVAL
                    </button>
                  </div>
                )}

                {/* 3. Arrived Stage */}
                {status === 'arrived' && (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-400 font-light">
                      Unit is on-site with the stranded EV driver. Connect charging equipment or secure towing rig.
                    </p>
                    <button
                      onClick={() => updateStatus('servicing')}
                      className="w-full py-3.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold animate-pulse"
                    >
                      START RESCUE SERVICING
                    </button>
                  </div>
                )}

                {/* 4. Servicing Stage: Settle & Complete */}
                {status === 'servicing' && (
                  <form onSubmit={handleCompleteMission} className="space-y-4">
                    <p className="text-xs text-neutral-400 font-light">
                      EV charge or carrier towing underway. Enter final settlement tariff to complete mission.
                    </p>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                        Final Tariff Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={finalCost}
                        onChange={(e) => setFinalCost(e.target.value)}
                        required
                        className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                        Completion Log / Debrief Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="e.g. Delivered 25 kWh charge via mobile CCS2 unit."
                        className="w-full bg-skyroot-black border border-skyroot-border p-3 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={completing}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-skyroot-black font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
                    >
                      {completing ? 'FINALIZING...' : 'COMPLETE & CLOSE MISSION'}
                    </button>
                  </form>
                )}

                {/* 5. Completed */}
                {status === 'completed' && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 text-center font-mono text-xs text-emerald-400">
                    MISSION SUCCESSFULLY FULFILLED AND ARCHIVED.
                  </div>
                )}
              </div>
            </div>

            {/* Target Driver Profile */}
            <div className="skyroot-card p-6">
              <span className="text-[10px] font-mono tracking-[0.2em] text-skyroot-muted uppercase block mb-2">
                CUSTOMER INFORMATION
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">Driver</span>
                  <span className="text-white">{job.user_name || 'EV Driver'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">Contact Phone</span>
                  <span className="text-skyroot-accent">{job.user_phone || '+91 9876543210'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">Vehicle</span>
                  <span className="text-white">{job.ev_model || 'Tata Nexon EV'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">License Plate</span>
                  <span className="text-white">{job.license_plate || 'DL1CA1234'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
