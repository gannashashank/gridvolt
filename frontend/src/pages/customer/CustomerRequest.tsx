import React, { useEffect, useState } from 'react';
import IndiaMap from '../../components/IndiaMap';
import HorizontalStepper from '../../components/HorizontalStepper';
import supabase from '../../lib/supabaseClient';

interface CustomerRequestProps {
  requestId: string;
  navigate: (path: string, params?: any) => void;
}

export default function CustomerRequest({ requestId, navigate }: CustomerRequestProps) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const fetchRequest = async () => {
    try {
      const { data, error: reqErr } = await supabase
        .from('assistance_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqErr) throw reqErr;
      setRequest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve dispatch telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();

    // Subscribe to realtime status changes
    const subscription = supabase
      .channel('assistance_requests')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assistance_requests' },
        (payload: any) => {
          if (payload.new && payload.new.id === requestId) {
            setRequest((prev: any) => ({ ...prev, ...payload.new }));
            fetchRequest();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [requestId]);

  const handleAcceptQuote = async () => {
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from('assistance_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateErr) throw updateErr;
      await fetchRequest();
    } catch (err: any) {
      alert(err.message || 'Error accepting dispatch quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Abort this emergency assistance request?')) return;
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from('assistance_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (updateErr) throw updateErr;
      navigate('/app/home');
    } catch (err: any) {
      alert(err.message || 'Cancellation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cost = request?.quote?.estimated_cost || 392.6;
      const res = await fetch('/api/service-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gv_token')}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          service_type: request?.provider?.service_capability || 'Emergency Charging Rescue',
          final_cost: cost,
          notes,
          rating,
        }),
      });

      if (!res.ok) throw new Error('Submission failed');
      navigate('/app/history');
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-skyroot-black text-white font-mono text-xs">
        <div className="w-8 h-8 border-2 border-skyroot-accent border-t-transparent animate-spin mb-4"></div>
        <span className="tracking-[0.2em] uppercase text-skyroot-muted">
          SYNCHRONIZING SATELLITE TELEMETRY...
        </span>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 skyroot-card text-center">
        <span className="text-red-500 font-mono text-xs block mb-2">[TELEMETRY ERROR]</span>
        <p className="text-neutral-300 text-sm mb-6">{error || 'Target record not found.'}</p>
        <button
          onClick={() => navigate('/app/home')}
          className="px-4 py-2 bg-skyroot-card border border-skyroot-border text-white text-xs font-mono uppercase tracking-wider hover:border-white"
        >
          RETURN TO CONSOLE
        </button>
      </div>
    );
  }

  const { status, quote, provider } = request;

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-skyroot-border">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/app/home')}
              className="text-xs font-mono text-neutral-400 hover:text-white uppercase tracking-wider"
            >
              ← CONSOLE
            </button>
            <span className="text-neutral-600 font-mono text-xs">/</span>
            <span className="text-xs font-mono text-skyroot-accent uppercase tracking-widest">
              DISPATCH #{request.id}
            </span>
          </div>

          <span
            className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest border ${
              status === 'completed'
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                : status === 'cancelled'
                ? 'border-red-500/50 text-red-400 bg-red-950/20'
                : 'border-skyroot-accent text-skyroot-accent bg-skyroot-accentMuted'
            }`}
          >
            STATUS: {status?.replace('_', ' ')}
          </span>
        </div>

        {/* Stepper Progression */}
        <div className="mb-8 skyroot-card p-6">
          <HorizontalStepper currentStatus={status} />
        </div>

        {/* Main Grid: Map & Action Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Dark-styled India Map */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="h-[500px] border border-skyroot-border relative overflow-hidden">
              <IndiaMap
                userLat={request.latitude}
                userLng={request.longitude}
                providerLat={provider?.latitude}
                providerLng={provider?.longitude}
                providerName={provider?.name}
              />
            </div>

            <div className="skyroot-card p-4 flex justify-between items-center text-xs font-mono text-neutral-400">
              <span>COORDINATE LOCK: {request.latitude?.toFixed(4)}° N, {request.longitude?.toFixed(4)}° E</span>
              <span className="text-skyroot-accent">TELEMETRY SYNCED VIA SSE</span>
            </div>
          </div>

          {/* Right: Quotation & Provider Cockpit */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            {/* 1. Transparent Quotation Review (Stage: requested) */}
            {status === 'requested' && (
              <div className="skyroot-card p-6 border-skyroot-accent/60">
                <span className="text-[10px] font-mono tracking-[0.2em] text-skyroot-accent uppercase block mb-1">
                  OFFICIAL TARIFF QUOTATION
                </span>
                <h3 className="text-lg font-light text-white uppercase mb-4">
                  Response Authorization
                </h3>

                <div className="space-y-3 py-4 border-y border-skyroot-border text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Estimated Distance</span>
                    <span className="text-white">{quote?.estimated_distance?.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Estimated Transit ETA</span>
                    <span className="text-white">{quote?.estimated_eta_minutes} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Base Callout Fee</span>
                    <span className="text-white">₹299.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Distance Tariff (₹18/km)</span>
                    <span className="text-white">
                      ₹{(quote?.estimated_distance * 18)?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="my-6 flex justify-between items-baseline">
                  <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                    Total Estimated Cost
                  </span>
                  <span className="text-3xl font-mono text-white font-light">
                    ₹{quote?.estimated_cost}
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAcceptQuote}
                    disabled={submitting}
                    className="w-full py-3.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
                  >
                    {submitting ? 'DISPATCHING CARRIER...' : 'ACCEPT QUOTE & DISPATCH'}
                  </button>
                  <button
                    onClick={handleCancelRequest}
                    disabled={submitting}
                    className="w-full py-2.5 bg-skyroot-black border border-skyroot-border hover:border-neutral-500 text-neutral-400 font-mono text-xs uppercase tracking-wider transition-all"
                  >
                    DECLINE REQUEST
                  </button>
                </div>
              </div>
            )}

            {/* 2. Provider Live Telemetry (Stage: accepted / en_route / arrived / servicing) */}
            {status !== 'requested' && status !== 'completed' && (
              <div className="skyroot-card p-6">
                <span className="text-[10px] font-mono tracking-[0.2em] text-skyroot-accent uppercase block mb-1">
                  DISPATCHED RESCUE CARRIER
                </span>
                <h3 className="text-lg font-medium text-white uppercase mb-4">
                  {provider?.name || 'Assigned Provider'}
                </h3>

                <div className="space-y-3 py-4 border-y border-skyroot-border text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Direct Hotline</span>
                    <span className="text-skyroot-accent">{provider?.phone || '+91 8765432100'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Carrier Unit</span>
                    <span className="text-white uppercase">{provider?.vehicle_type || 'Service Van'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Fleet Plate</span>
                    <span className="text-white">{provider?.license_plate || 'RJ27UA1111'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">System Capability</span>
                    <span className="text-neutral-300">{provider?.service_capability || 'DC Fast Charge'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 uppercase tracking-wider">Expected ETA</span>
                    <span className="text-emerald-400 font-bold">{quote?.estimated_eta_minutes} MINS</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleCancelRequest}
                    disabled={submitting}
                    className="w-full py-2.5 bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-900/30 font-mono text-xs uppercase tracking-wider transition-all"
                  >
                    ABORT RESCUE CALL
                  </button>
                </div>
              </div>
            )}

            {/* 3. Service Closure & Rating (Stage: completed) */}
            {status === 'completed' && (
              <div className="skyroot-card p-6 border-emerald-500/40">
                <span className="text-[10px] font-mono tracking-[0.2em] text-emerald-400 uppercase block mb-1">
                  MISSION ACCOMPLISHED
                </span>
                <h3 className="text-lg font-light text-white uppercase mb-4">
                  Service Completed
                </h3>

                <p className="text-xs text-neutral-400 mb-6 font-light">
                  The rescue provider has fulfilled the roadside assistance assignment. Rate this service to archive telemetry.
                </p>

                <form onSubmit={handleRateService} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                      Provider Rating (1 - 5)
                    </label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`w-9 h-9 font-mono text-sm border flex items-center justify-center transition-all ${
                            star <= rating
                              ? 'border-skyroot-accent bg-skyroot-accent text-white font-bold'
                              : 'border-skyroot-border text-neutral-500 bg-skyroot-black'
                          }`}
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                      Debrief Feedback Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="e.g. Rapid response, reached on Udaipur highway in 15 minutes."
                      className="w-full bg-skyroot-black border border-skyroot-border p-3 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-skyroot-black font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all"
                  >
                    {submitting ? 'ARCHIVING...' : 'SUBMIT DEBRIEF & CLOSE'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
