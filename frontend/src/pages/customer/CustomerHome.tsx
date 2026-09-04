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
  // Request Scope: Self vs Someone Else (Section 4A)
  const [requestScope, setRequestScope] = useState<'self' | 'someone_else'>('self');
  const [onsiteName, setOnsiteName] = useState('');
  const [onsitePhone, setOnsitePhone] = useState('');

  // Location search via Nominatim
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [targetLocationName, setTargetLocationName] = useState('');

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
    if (!user?.id) return;

    const fetchActiveRequest = async () => {
      try {
        const { data, error: reqErr } = await supabase
          .from('assistance_requests')
          .select('*');

        if (!reqErr && data) {
          const ongoing = data.find(
            (r: any) =>
              r.user_id === user?.id && !['completed', 'cancelled'].includes(r.status)
          );
          if (ongoing) setActiveRequest(ongoing);
        }
      } catch (err) {
        console.warn('Error fetching active dispatches:', err);
      }
    };

    fetchActiveRequest();
  }, [user?.id]);

  // Handle auto GPS for Self
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
          setTargetLocationName('Current GPS Coordinates');
        } else {
          setLatitude(defaultLat);
          setLongitude(defaultLng);
          setTargetLocationName('Udaipur Centroid (Default)');
          alert('Demo location snapped to India service area (Udaipur centroid).');
        }
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied:', err);
        setLatitude(defaultLat);
        setLongitude(defaultLng);
        setTargetLocationName('Udaipur Centroid (Default)');
        setLocating(false);
        setShowMapModal(true);
      },
      { timeout: 8000 }
    );
  };

  // Place Geocoding search (OpenStreetMap / Nominatim restricted to India)
  const handleSearchPlace = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=5&q=${encodeURIComponent(
          query
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (err) {
      console.warn('Nominatim search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setLatitude(lat);
    setLongitude(lon);
    setTargetLocationName(place.display_name.split(',').slice(0, 3).join(','));
    setSearchQuery(place.display_name.split(',').slice(0, 3).join(','));
    setSearchResults([]);
  };

  const handleTriggerSOS = async () => {
    setError('');

    // Validation for "Someone Else" (Section 4A)
    if (requestScope === 'someone_else') {
      if (latitude === null || longitude === null) {
        setError('Please search or pin the breakdown location on the map for the stranded person.');
        return;
      }
      if (!onsiteName.trim()) {
        setError("Please enter the stranded person's name.");
        return;
      }
      if (!onsitePhone.trim()) {
        setError("Please enter the stranded person's contact phone number.");
        return;
      }
    } else {
      // For Myself
      if (latitude === null || longitude === null) {
        requestGeolocation();
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        latitude,
        longitude,
        service_type:
          serviceType === 'charging'
            ? 'Emergency Mobile DC Charging'
            : 'Flatbed Carrier Towing',
        is_for_self: requestScope === 'self',
        onsite_contact_name: requestScope === 'self' ? (user?.name || 'EV Driver') : onsiteName.trim(),
        onsite_contact_phone: requestScope === 'self' ? (user?.phone || '') : onsitePhone.trim(),
      };

      const { data, error: reqErr } = await supabase
        .from('assistance_requests')
        .insert(payload);

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
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 border-b border-skyroot-border overflow-hidden">
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
                {activeRequest.is_for_self === 0 && (
                  <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                    REMOTE RESCUE FOR: {activeRequest.onsite_contact_name} ({activeRequest.onsite_contact_phone})
                  </span>
                )}
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
          <div className="mt-10 max-w-2xl">
            <div className="skyroot-card p-6 md:p-8">
              {/* Section 4A: Scope Toggle: For Myself vs For Someone Else */}
              <div className="mb-6 pb-6 border-b border-skyroot-border">
                <span className="text-[10px] font-mono tracking-widest uppercase text-skyroot-muted block mb-3">
                  DISPATCH RECIPIENT // WHO IS THIS FOR?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestScope('self');
                      setError('');
                    }}
                    className={`py-3 px-4 text-xs font-mono uppercase tracking-wider text-center border transition-all ${
                      requestScope === 'self'
                        ? 'border-skyroot-accent bg-skyroot-accentMuted text-white font-bold ring-1 ring-skyroot-accent'
                        : 'border-skyroot-border bg-skyroot-black text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    REQUEST FOR MYSELF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestScope('someone_else');
                      setError('');
                      setLatitude(null);
                      setLongitude(null);
                      setTargetLocationName('');
                    }}
                    className={`py-3 px-4 text-xs font-mono uppercase tracking-wider text-center border transition-all ${
                      requestScope === 'someone_else'
                        ? 'border-skyroot-accent bg-skyroot-accentMuted text-white font-bold ring-1 ring-skyroot-accent'
                        : 'border-skyroot-border bg-skyroot-black text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    FOR SOMEONE ELSE
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-mono">
                  [VALIDATION ALERT] {error}
                </div>
              )}

              {/* Service Type Selection */}
              <div className="mb-6">
                <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block mb-2">
                  REQUIRED ASSISTANCE TYPE
                </span>
                <div className="grid grid-cols-2 gap-3">
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
              </div>

              {/* SECTION 4A: Someone Else Form Fields */}
              {requestScope === 'someone_else' ? (
                <div className="space-y-4 mb-6 p-4 bg-skyroot-surface border border-skyroot-border">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-skyroot-accent">
                    [REMOTE RECIPIENT] ON-SITE CONTACT SPECIFICATIONS
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                        Stranded Person's Name *
                      </label>
                      <input
                        type="text"
                        value={onsiteName}
                        onChange={(e) => setOnsiteName(e.target.value)}
                        placeholder="e.g. Priya Sharma"
                        className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                        Stranded Person's Phone *
                      </label>
                      <input
                        type="tel"
                        value={onsitePhone}
                        onChange={(e) => setOnsitePhone(e.target.value)}
                        placeholder="+91 98765 11223"
                        className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Location Search Box (Nominatim Geocoding) */}
                  <div className="relative pt-2">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                      Target Breakdown Location (India) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchPlace(e.target.value)}
                        placeholder="Type city, landmark, or highway (e.g. Gachibowli, Hyderabad)..."
                        className="flex-1 bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (latitude === null) {
                            setLatitude(defaultLat);
                            setLongitude(defaultLng);
                          }
                          setShowMapModal(true);
                        }}
                        className="px-3 py-2 bg-skyroot-black border border-skyroot-border hover:border-white text-[10px] font-mono uppercase tracking-wider text-neutral-300"
                      >
                        PIN MAP
                      </button>
                    </div>

                    {searching && (
                      <div className="text-[10px] font-mono text-skyroot-muted mt-1">
                        Searching Indian geographical indices...
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-skyroot-black border border-skyroot-border z-30 max-h-48 overflow-y-auto shadow-2xl">
                        {searchResults.map((place, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPlace(place)}
                            className="w-full text-left px-3 py-2 text-xs font-mono border-b border-skyroot-border/60 hover:bg-skyroot-card hover:text-skyroot-accent transition-colors"
                          >
                            {place.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Location Coordinate Lock Status */}
                  <div className="p-2.5 bg-skyroot-black border border-skyroot-border flex justify-between items-center text-[11px] font-mono">
                    <span className="text-neutral-400">
                      TARGET FIX: {latitude ? `${latitude.toFixed(4)}° N, ${longitude?.toFixed(4)}° E` : 'NOT SPECIFIED'}
                    </span>
                    {targetLocationName && (
                      <span className="text-skyroot-accent truncate max-w-[200px]">
                        {targetLocationName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Location Coordinates Lock for Self */
                <div className="mb-6 p-3 bg-skyroot-black border border-skyroot-border flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-skyroot-muted uppercase tracking-widest block">
                      MY GPS FIX
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
                    {locating ? 'SCANNING...' : latitude ? 'MODIFY GPS' : 'ACQUIRE GPS'}
                  </button>
                </div>
              )}

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
                    <span>
                      {requestScope === 'someone_else'
                        ? 'DISPATCH RESCUE FOR SOMEONE ELSE'
                        : 'TRIGGER EMERGENCY SOS'}
                    </span>
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
              { label: 'Remote Dispatch', value: 'National Coverage' },
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
              { label: 'Target Matching', value: 'Breakdown Coordinates' },
              { label: 'Geocoding', value: 'OSM Nominatim Engine' },
              { label: 'Sync Channel', value: 'Realtime SSE Stream' },
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
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-skyroot-black/85 backdrop-blur-md">
          <div className="w-full max-w-3xl skyroot-card p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-skyroot-border pb-3">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-skyroot-accent uppercase">
                  {requestScope === 'someone_else' ? 'REMOTE PINPOINT' : 'GPS FALLBACK'}
                </span>
                <h3 className="text-base font-medium text-white uppercase mt-0.5">
                  Confirm Breakdown Coordinates on India Map
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
                userLat={latitude || defaultLat}
                userLng={longitude || defaultLng}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                interactive
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-skyroot-border">
              <span className="text-xs font-mono text-neutral-400">
                TARGET: {latitude ? latitude.toFixed(5) : defaultLat.toFixed(5)}° N,{' '}
                {longitude ? longitude.toFixed(5) : defaultLng.toFixed(5)}° E
              </span>
              <button
                onClick={() => {
                  if (latitude === null) {
                    setLatitude(defaultLat);
                    setLongitude(defaultLng);
                  }
                  setShowMapModal(false);
                }}
                className="px-6 py-2.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-bold"
              >
                CONFIRM TARGET PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
