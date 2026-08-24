import React, { useEffect, useState } from 'react';
import IndiaMap from '../components/IndiaMap';
import Minimap3D from '../components/Minimap3D';
import supabase from '../lib/supabaseClient';

interface RequestDetailsProps {
  requestId: string;
  navigate: (page: string) => void;
}

export default function RequestDetails({ requestId, navigate }: RequestDetailsProps) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Fetch request data
  const fetchRequestDetails = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('assistance_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchErr) throw fetchErr;
      setRequest(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();

    // Subscribe to status updates for this request in real-time
    const subscription = supabase
      .channel(`assistance_requests`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'assistance_requests' },
        (payload: any) => {
          if (payload.new && payload.new.id === requestId) {
            setRequest((prev: any) => ({
              ...prev,
              ...payload.new,
            }));
            // Refresh details in case provider profile updates
            fetchRequestDetails();
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
      fetchRequestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to accept quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel this assistance request?')) return;
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from('assistance_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (updateErr) throw updateErr;
      navigate('home');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cost = request?.quote?.estimated_cost || 450;
      const res = await fetch('/api/service-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gv_token')}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          service_type: request?.provider?.service_capability || 'EV Charging Rescue',
          final_cost: cost,
          notes,
          rating,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit rating');
      navigate('home');
    } catch (err: any) {
      alert(err.message || 'Error closing service record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4">Establishing Satellite Feed...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 glass-panel rounded-xl text-center">
        <h3 className="text-rose-500 font-bold mb-2">Request Error</h3>
        <p className="text-xs text-slate-400 mb-6">{error || 'Target request is missing.'}</p>
        <button onClick={() => navigate('home')} className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold">
          Return Home
        </button>
      </div>
    );
  }

  const { status, quote, provider } = request;

  // Determine stage index
  const stages = ['requested', 'accepted', 'en_route', 'arrived', 'servicing', 'completed'];
  const currentStageIndex = stages.indexOf(status);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-12">
      {/* Back button */}
      <button onClick={() => navigate('home')} className="text-xs text-slate-400 hover:text-cyan-400 transition mb-6 flex items-center gap-1">
        ← Exit Tracker
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Leaflet Tracking Map with overlay */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="h-[450px] relative rounded-xl overflow-hidden border border-slate-800">
            <IndiaMap
              userLat={request.latitude}
              userLng={request.longitude}
              providerLat={provider?.latitude}
              providerLng={provider?.longitude}
              providerName={provider?.name}
            />

            {/* Float overlay: 3D minimap on en_route */}
            {(status === 'en_route' || status === 'accepted' || status === 'arrived') && (
              <div className="absolute bottom-4 right-4 z-[400] w-64 md:w-72">
                <Minimap3D status={status} distanceKm={quote?.estimated_distance || 5} />
              </div>
            )}
          </div>

          {/* Status timeline */}
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Rescue Progress Logs</h4>
            <div className="grid grid-cols-6 gap-2 text-center text-[10px] relative">
              {stages.map((stage, idx) => {
                const isActive = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div key={stage} className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold ${isCurrent ? 'bg-cyan-500 text-slate-950 border-cyan-400 neon-glow-cyan' : isActive ? 'bg-slate-850 text-emerald-400 border-emerald-500' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                      {idx + 1}
                    </div>
                    <span className={`mt-2 capitalize ${isCurrent ? 'text-cyan-400 font-bold' : isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                      {stage.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Quote Panel and Provider Specs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quote details */}
          {status === 'requested' && (
            <div className="glass-panel p-6 rounded-xl border-cyan-500/25">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-[9px] uppercase px-2 py-0.5 rounded font-mono">
                Matching Succeeded
              </span>
              <h3 className="text-xl font-bold text-white mt-3">Roadside Quotation</h3>
              <p className="text-xs text-slate-400 mt-1">Accept the transparent quote to dispatch provider.</p>

              <div className="mt-6 space-y-3 border-y border-slate-900 py-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-450">Estimated Distance:</span>
                  <span className="font-mono text-slate-200">{quote?.estimated_distance?.toFixed(1)} Km</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-450">Estimated ETA:</span>
                  <span className="font-mono text-slate-200">{quote?.estimated_eta_minutes} Mins</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-450">Base Response Fare:</span>
                  <span className="font-mono text-slate-200">₹299.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-450">Travel Surcharge (₹18/km):</span>
                  <span className="font-mono text-slate-200">₹{(quote?.estimated_distance * 18)?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center my-6">
                <span className="text-sm font-semibold">Total Cost estimate:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">₹{quote?.estimated_cost}</span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleAcceptQuote}
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Accept Quote & Dispatch'}
                </button>
                <button
                  onClick={handleCancelRequest}
                  disabled={submitting}
                  className="w-full py-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-350 rounded-lg text-xs transition"
                >
                  Cancel Breakdown Request
                </button>
              </div>
            </div>
          )}

          {/* Active provider details */}
          {status !== 'requested' && status !== 'completed' && (
            <div className="glass-panel p-6 rounded-xl">
              <h4 className="text-sm font-bold text-white mb-4">Assigned Service Provider</h4>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">{provider?.name || 'Vijay Kumar'}</h5>
                  <p className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">
                    {provider?.vehicle_type || 'Van'} • {provider?.license_plate || 'RJ27UA1111'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-900 pt-4 mb-6 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-450">Contact Hot-line:</span>
                  <span className="font-semibold text-cyan-400">{provider?.phone || '+91 8765432100'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Capability:</span>
                  <span className="font-semibold text-slate-300">{provider?.service_capability || 'Level 2 DC charging'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Current ETA:</span>
                  <span className="font-semibold text-emerald-400 font-mono">{quote?.estimated_eta_minutes} Mins</span>
                </div>
              </div>

              <button
                onClick={handleCancelRequest}
                className="w-full py-2.5 bg-rose-500/10 border border-rose-500/35 hover:bg-rose-500/20 text-rose-450 rounded-lg text-xs font-semibold transition"
              >
                Abort Rescue Mission
              </button>
            </div>
          )}

          {/* Service Closure Rating Modal */}
          {status === 'completed' && (
            <div className="glass-panel p-6 rounded-xl border-emerald-500/20">
              <h3 className="text-lg font-bold text-white mb-2">Service Completed</h3>
              <p className="text-xs text-slate-400 mb-6">Rate your roadside rescue service to close the request.</p>

              <form onSubmit={handleRateService} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Rate Provider (1-5 Stars)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl transition ${star <= rating ? 'text-amber-450' : 'text-slate-700'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Service Feedback Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none"
                    placeholder="Vijay arrived quickly and charged my car 20% to reach home. Polite guy."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  {submitting ? 'Closing Record...' : 'Submit Rating & Return'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
