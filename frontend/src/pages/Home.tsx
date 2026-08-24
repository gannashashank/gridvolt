import React, { useState } from 'react';
import Car3D from '../components/Car3D';
import Pulse3D from '../components/Pulse3D';
import IndiaMap from '../components/IndiaMap';
import supabase from '../lib/supabaseClient';

interface HomeProps {
  user: any;
  navigate: (page: string, params?: any) => void;
}

export default function Home({ user, navigate }: HomeProps) {
  const [serviceType, setServiceType] = useState<'charging' | 'towing'>('charging');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [error, setError] = useState('');

  // Snap-to-India centroid defaults
  const defaultLat = 24.5854; // Udaipur
  const defaultLng = 73.7125;

  const requestGeolocation = () => {
    setLocating(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser. Dropped manual pin fallback.');
      setLatitude(defaultLat);
      setLongitude(defaultLng);
      setLocating(false);
      setShowMapModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        // Check if inside India bounding box
        const inside = lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
        if (inside) {
          setLatitude(lat);
          setLongitude(lng);
        } else {
          // Overseas mock snap
          setLatitude(defaultLat);
          setLongitude(defaultLng);
          alert('Demo location snapped to India service area (Udaipur Centroid).');
        }
        setLocating(false);
        setShowMapModal(true);
      },
      (err) => {
        console.warn('Geolocation lookup denied:', err);
        setError('Location permission denied. Dropped manual pin fallback.');
        setLatitude(defaultLat);
        setLongitude(defaultLng);
        setLocating(false);
        setShowMapModal(true);
      },
      { timeout: 8000 }
    );
  };

  const handleSOS = async () => {
    if (latitude === null || longitude === null) {
      requestGeolocation();
      return;
    }

    setSubmitting(true);
    setShowPulse(true);
    setError('');

    // Let the 3D pulse wave play for 2.2 seconds before changing view
    setTimeout(async () => {
      try {
        const { data, error: reqErr } = await supabase.from('assistance_requests').insert({
          latitude,
          longitude,
          service_type: serviceType === 'charging' ? 'Emergency Level 3 Charging' : 'Flatbed Towing Service',
        });

        if (reqErr) {
          throw new Error(reqErr.message || 'Matching failed');
        }

        const newRequest = Array.isArray(data) ? data[0] : data;
        setShowPulse(false);
        setSubmitting(false);

        if (newRequest && newRequest.id) {
          navigate('request', { requestId: newRequest.id });
        } else {
          throw new Error('No request record returned.');
        }
      } catch (err: any) {
        setShowPulse(false);
        setSubmitting(false);
        setError(err.message || 'Failed to trigger dispatch. Please retry.');
      }
    }, 2200);
  };

  return (
    <div className="min-h-screen relative pb-16">
      {/* 3D Shockwave Pulse Overlay */}
      {showPulse && <Pulse3D />}

      <div className="max-w-6xl mx-auto px-4 pt-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-wider text-cyan-400">GRIDVOLT</h1>
            <p className="text-xs text-slate-400">Welcome, {user?.name || 'EV Driver'}</p>
          </div>
          <button
            onClick={() => navigate('history')}
            className="text-xs bg-slate-900/60 hover:bg-slate-800 px-4 py-2 rounded-lg border border-slate-800 text-slate-300 transition"
          >
            Assistance Logs
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/35 text-rose-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left panel: 3D Visualizer */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
              EV Status Visualizer
            </h2>
            <Car3D />
            <div className="mt-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex justify-between text-xs text-slate-400">
              <div>Battery: <b className="text-emerald-400">14% (Breakdown Risk)</b></div>
              <div>Range Remaining: <b className="text-emerald-450">18 Km</b></div>
              <div>System Health: <b className="text-cyan-400">Stable</b></div>
            </div>
          </div>

          {/* Right panel: SOS Console */}
          <div className="lg:col-span-5 glass-panel p-8 rounded-2xl border-cyan-500/20 relative">
            <h3 className="text-xl font-bold text-white mb-4">Emergency Console</h3>
            <p className="text-xs text-slate-400 mb-6">
              Stranded on a highway or in city traffic? Hit SOS to dispatch the nearest mobile fast charging vehicle or tow carrier.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Type Required</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setServiceType('charging')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center transition ${serviceType === 'charging' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <span className="text-2xl mb-1">⚡</span>
                    <span className="text-xs font-bold">Emergency Charge</span>
                    <span className="text-[10px] opacity-60 mt-0.5">Mobile L3 CCS2</span>
                  </button>
                  <button
                    onClick={() => setServiceType('towing')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center transition ${serviceType === 'towing' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <span className="text-2xl mb-1">🚜</span>
                    <span className="text-xs font-bold">Flatbed Towing</span>
                    <span className="text-[10px] opacity-60 mt-0.5">Heavy Carrier</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location Coordinates</label>
                {latitude !== null && longitude !== null ? (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-850">
                    <span className="text-xs font-mono text-cyan-400">
                      Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                    </span>
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="text-[11px] text-cyan-500 hover:underline"
                    >
                      Update Pin
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={requestGeolocation}
                    disabled={locating}
                    className="w-full py-3 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    {locating ? (
                      <>
                        <span className="w-3 h-3 rounded-full border border-t-cyan-500 animate-spin"></span>
                        Fetching Satellite Coordinates...
                      </>
                    ) : (
                      <>
                        📍 Capture GPS Location
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleSOS}
              disabled={submitting}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white hover:from-rose-600 hover:to-red-700 text-center text-lg font-black tracking-widest shadow-xl shadow-red-500/20 uppercase transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 neon-glow-red border border-red-400/20"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-t-white animate-spin"></span>
                  Finding Providers...
                </>
              ) : (
                '🔴 TRIGGER SOS SIGNAL'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Map modal for coordinate adjustments */}
      {showMapModal && latitude !== null && longitude !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 relative flex flex-col max-h-[90vh]">
            <h4 className="text-lg font-bold text-white mb-2">Confirm Breakdown Coordinate</h4>
            <p className="text-xs text-slate-400 mb-4">
              Click anywhere on the map to manually move your pin. Clamped inside India bounds.
            </p>

            <div className="flex-1 min-h-[300px] h-96 mb-4">
              <IndiaMap
                userLat={latitude}
                userLng={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                interactive={true}
              />
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-slate-500 font-mono">
                Centroid: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
              <button
                onClick={() => setShowMapModal(false)}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Lock Location & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
