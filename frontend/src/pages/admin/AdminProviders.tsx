import React, { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface AdminProvidersProps {
  user: any;
  navigate: (path: string) => void;
}

export default function AdminProviders({ user, navigate }: AdminProvidersProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data || []);
      }
    } catch (err) {
      console.error('Failed to query providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();

    // Listen to provider position updates
    const subscription = supabase
      .channel('providers')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'providers' },
        () => {
          fetchProviders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-skyroot-border gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase mb-1">
              <span className="w-2 h-2 bg-skyroot-accent"></span>
              <span>FLEET UNITS DIRECTORY</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Assistance Providers Radar
            </h1>
          </div>

          <span className="text-xs font-mono text-skyroot-muted uppercase tracking-widest">
            REGISTERED UNITS: {providers.length}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-skyroot-muted">
            SYNCHRONIZING FLEET RADAR...
          </div>
        ) : (
          <div className="skyroot-card overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-skyroot-border text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Carrier Unit / Operator</th>
                  <th className="p-4">Fleet Status</th>
                  <th className="p-4">Vehicle Type</th>
                  <th className="p-4">Charging Capability</th>
                  <th className="p-4">Radar Location</th>
                  <th className="p-4">Hotline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skyroot-border/60">
                {providers.map((p) => {
                  const isAvailable = p.availability === 1 || p.availability === true;
                  return (
                    <tr key={p.id} className="hover:bg-skyroot-cardHover transition-colors">
                      <td className="p-4 font-medium text-white">
                        <span className="block">{p.name || 'Provider Unit'}</span>
                        <span className="text-[10px] text-neutral-400 block">{p.license_plate}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 text-[9px] uppercase tracking-wider border ${
                            isAvailable
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : 'border-neutral-700 bg-skyroot-surface text-neutral-500'
                          }`}
                        >
                          {isAvailable ? 'AVAILABLE' : 'STANDBY / OFFLINE'}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-300 uppercase">{p.vehicle_type || 'Van'}</td>
                      <td className="p-4 text-neutral-300">{p.service_capability || 'DC Charge'}</td>
                      <td className="p-4 text-skyroot-accent">
                        {p.latitude?.toFixed(4)}° N, {p.longitude?.toFixed(4)}° E
                      </td>
                      <td className="p-4 text-neutral-300">{p.phone || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
