import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import IndiaMap from '../../components/IndiaMap';
import SpecCard from '../../components/SpecCard';
import supabase from '../../lib/supabaseClient';

interface CustomerHomeProps {
  user: any;
  navigate: (path: string, params?: any) => void;
}

export default function CustomerHome({ user, navigate }: CustomerHomeProps) {
  const [serviceType, setServiceType] = useState<'charging' | 'towing'>('charging');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [error, setError] = useState('');

  // Default coordinate: Udaipur centroid
  const defaultLat = 24.5854;
  const defaultLng = 73.7125;

  // Check for any ongoing active request
  useEffect(() => {
    const fetchActiveRequest = async () => {
      try {
        const { data, error: reqErr } = await supabase
          .from('assistance_requests')
          .select('*');

        if (!reqErr && data) {
          const ongoing = data.find(
            (r: any) =>
              r.user_id === user.id && !['completed', 'cancelled'].includes(r.status)
          );
          if (ongoing) setActiveRequest(ongoing);
        }
      } catch (err) {
        console.warn('Error fetching active dispatches:', err);
      }
    };

    fetchActiveRequest();
  }, [user.id]);

  const requestGeolocation = () => {
    setLocating(true);
    setError('');

    if (!navigator.geolocation) {
      setLatitude(defaultLat);
      setLongitude(defaultLng);
      setLocating(false);
      setShowMapModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const isInsideIndia = lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
        if (isInsideIndia) {
          setLatitude(lat);
          setLongitude(lng);
        } else {
          setLatitude(defaultLat);
          setLongitude(defaultLng);
          alert('Demo location snapped to India service area (Udaipur centroid).');
        }
        setLocating(false);
        setShowMapModal(true);
      },
      (err) => {
        console.warn('Geolocation denied:', err);
        setLatitude(defaultLat);
        setLongitude(defaultLng);
        setLocating(false);
        setShowMapModal(true);
      },
      { timeout: 8000 }
    );
  };

  const handleTriggerSOS = async () => {
    if (latitude === null || longitude === null) {
      requestGeolocation();
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data, error: reqErr } = await supabase.from('assistance_requests').insert({
        latitude,
        longitude,
        service_type:
          serviceType === 'charging'
            ? 'Emergency Mobile DC Charging'
            : 'Flatbed Carrier Towing',
      });

      if (reqErr) throw new Error(reqErr.message || 'Matching dispatch failed.');

      const newRequest = Array.isArray(data) ? data[0] : data;
      setSubmitting(false);

      if (newRequest && newRequest.id) {
        navigate(`/app/request/${newRequest.id}`, { requestId: newRequest.id });
      } else {
        throw new Error('No dispatch record received from server.');
      }
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || 'Dispatch failed. Retrying radar search.');
    }
  };

  return (
    <div className="bg-skyroot-black min-h-screen text-white relative">
      {/* 1. Full-bleed Atmospheric Hero Section */}
      <section className="relative pt-16 pb-24 md:pt-28 md:pb-36 border-b border-skyroot-border overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-radial-vignette opacity-80 pointer-events-none z-10"></div>
        <div className="absolute inset-0 hero-gradient-overlay pointer-events-none z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#22242A_1px,transparent_1px)] [background-size:32px_32px] opacity-35 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center space-x-2 text-[10px] font-mono tracking-[0.3em] text-skyroot-accent uppercase mb-4">
              <span className="w-1.5 h-1.5 bg-skyroot-accent"></span>
              <span>EMERGENCY ROADSIDE POWER // INDIA NETWORK</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white uppercase leading-[1.05]">
              Power, wherever <br />
              <span className="font-normal text-neutral-300">you're stranded.</span>
            </h1>

            <p className="mt-6 text-sm md:text-base text-neutral-400 max-w-2xl font-light leading-relaxed">
              Real-time emergency roadside charging and flatbed recovery across national highways and urban corridors. Instant dispatch matching in under 3 seconds.
            </p>
          </motion.div>

          {/* Active Request Alert (if any) */}
          {activeRequest && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-skyroot-card border border-skyroot-accent/60 max-w-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-skyroot-accent block mb-1">
                  [LIVE STATUS] ONGOING RESCUE DISPATCH
                </span>
                <span className="text-sm font-medium text-white">
                  Job ID: {activeRequest.id} • Status: {activeRequest.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <button
                onClick={() =>
                  navigate(`/app/request/${activeRequest.id}`, { requestId: activeRequest.id })
                }
                className="px-4 py-2 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-semibold"
              >
                OPEN TRACKER →
              </button>
            </motion.div>
          )}

          {/* 2. Primary SOS Trigger Panel */}
          <div className="mt-12 max-w-2xl">
            <div className="skyroot-card p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-skyroot-border pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-skyroot-muted block">
                    SERVICE DISPATCH PROTOCOL
                  </span>
                  <span className="text-sm font-medium text-white uppercase mt-0.5 block">
                    Specify Assistance Need
                  </span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                  NETWORK READY
                </span>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-950/50 border border-red-500/40 text-red-400 text-xs font-mono">
                  [SYSTEM ALERT] {error}
                </div>
              )}

              {/* Service Type Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setServiceType('charging')}
                  className={`p-4 border text-left transition-all ${
                    serviceType === 'charging'
                      ? 'border-skyroot-accent bg-skyroot-accentMuted'
                      : 'border-skyroot-border bg-skyroot-black hover:border-neutral-700'
                  }`}
                >
                  <span className="block text-[9px] font-mono tracking-widest text-skyroot-muted uppercase">
                    OPTION 01
                  </span>
                  <span className="block text-sm font-medium text-white mt-1 uppercase">
                    MOBILE DC CHARGE
                  </span>
                  <span className="block text-[10px] font-mono text-neutral-400 mt-1">
                    Level 3 CCS2 / 120kW
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType('towing')}
                  className={`p-4 border text-left transition-all ${
                    serviceType === 'towing'
                      ? 'border-skyroot-accent bg-skyroot-accentMuted'
                      : 'border-skyroot-border bg-skyroot-black hover:border-neutral-700'
                  }`}
                >
                  <span className="block text-[9px] font-mono tracking-widest text-skyroot-muted uppercase">
                    OPTION 02
                  </span>
                  <span className="block text-sm font-medium text-white mt-1 uppercase">
                    FLATBED TOWING
                  </span>
                  <span className="block text-[10px] font-mono text-neutral-400 mt-1">
                    Hydraulic Carrier
                  </span>
                </button>
              </div>

              {/* Location Coordinates Lock */}
              <div className="mb-6 p-3 bg-skyroot-black border border-skyroot-border flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[9px] text-skyroot-muted uppercase tracking-widest block">
                    CURRENT FIX
                  </span>
                  <span className="text-white text-[11px]">
                    {latitude !== null && longitude !== null
                      ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
                      : 'GPS Coordinate Required'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={requestGeolocation}
                  disabled={locating}
                  className="px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider border border-skyroot-border hover:border-white text-neutral-300 transition-colors"
                >
                  {locating ? 'SCANNING...' : latitude ? 'MODIFY PIN' : 'ACQUIRE GPS'}
                </button>
              </div>

              {/* Confident SOS CTA */}
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={submitting}
                className="w-full py-4 px-6 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-sm uppercase tracking-[0.25em] font-bold transition-all shadow-xl disabled:opacity-50 flex items-center justify-center space-x-3"
              >
                {submitting ? (
                  <span>DISPATCHING NEAREST CARRIER...</span>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-white animate-ping"></span>
                    <span>TRIGGER EMERGENCY SOS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Vikram-I Inspired Capabilities Spec Section */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-4 border-b border-skyroot-border">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase block mb-1">
              INFRASTRUCTURE SPECIFICATIONS
            </span>
            <h2 className="text-2xl md:text-3xl font-light tracking-tight text-white uppercase">
              GridVolt Rapid Response System
            </h2>
          </div>
          <span className="text-xs font-mono text-skyroot-muted uppercase tracking-widest mt-2 md:mt-0">
            SPEC DOC // 2026.08
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SpecCard
            tag="FLEET ARCHITECTURE"
            title="Rapid Response Fleet"
            primaryStat="500+"
            primaryStatLabel="VERIFIED RESCUE UNITS"
            bullets={[
              { label: 'Mobile CCS2', value: '120 kW Fast DC' },
              { label: 'Carrier Towing', value: 'Low-Angle Hydraulic' },
              { label: 'Coverage', value: 'Highways & Metros' },
              { label: 'Readiness', value: '24/7 Hot Standby' },
            ]}
          />

          <SpecCard
            tag="DISPATCH TELEMETRY"
            title="Autonomous Routing"
            primaryStat="18 MIN"
            primaryStatLabel="AVERAGE URBAN ETA"
            highlight
            bullets={[
              { label: 'Dispatch Engine', value: 'Weighted Algorithmic' },
              { label: 'Sync Channel', value: 'Realtime SSE Stream' },
              { label: 'Geofence', value: 'Hardlocked India BBox' },
              { label: 'Tracking', value: 'Live 2D Coordinate Push' },
            ]}
          />

          <SpecCard
            tag="TARIFF SPECIFICATION"
            title="Transparent Pricing"
            primaryStat="₹299"
            primaryStatLabel="BASE CALLOUT FARE"
            bullets={[
              { label: 'Transit Rate', value: '₹18.00 / km' },
              { label: 'Night Surcharge', value: '₹150 (22:00 - 06:00)' },
              { label: 'Settlement', value: 'Digital Verification' },
              { label: 'Tariff Integrity', value: 'Pre-Approval Quote' },
            ]}
          />
        </div>
      </section>

      {/* Manual Pin-Drop Location Modal */}
      {showMapModal && latitude !== null && longitude !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-skyroot-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl skyroot-card p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-skyroot-border pb-3">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-skyroot-accent uppercase">
                  MANUAL PIN FALLBACK
                </span>
                <h3 className="text-base font-medium text-white uppercase mt-0.5">
                  Confirm Breakdown Coordinates
                </h3>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-neutral-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-[360px] mb-4">
              <IndiaMap
                userLat={latitude}
                userLng={longitude}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                interactive
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-skyroot-border">
              <span className="text-xs font-mono text-neutral-400">
                LOCKED: {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
              </span>
              <button
                onClick={() => setShowMapModal(false)}
                className="px-6 py-2.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-bold"
              >
                CONFIRM COORDINATES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
