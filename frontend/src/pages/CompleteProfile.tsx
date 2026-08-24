import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';

interface CompleteProfileProps {
  user: any;
  onComplete: () => void;
  navigate: (page: string) => void;
}

export default function CompleteProfile({ user, onComplete, navigate }: CompleteProfileProps) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [evModel, setEvModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('van');
  const [serviceCapability, setServiceCapability] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role = user?.role || 'user';

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      name,
      phone,
      ev_model: role === 'user' ? evModel : null,
      license_plate: licensePlate,
      vehicle_type: role === 'provider' ? vehicleType : null,
      service_capability: role === 'provider' ? serviceCapability : null,
    };

    const { error: updateErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    setLoading(false);

    if (updateErr) {
      setError(updateErr.message || 'Failed to update profile');
      return;
    }

    // Update local storage representation of profile
    const storedUser = localStorage.getItem('gv_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('gv_user', JSON.stringify({ ...parsed, name }));
    }

    onComplete();
    if (role === 'provider') {
      navigate('provider');
    } else {
      navigate('home');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-2xl font-bold mb-3">
            📋
          </div>
          <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-slate-400 text-xs mt-1">Please provide missing details to activate your role</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
              placeholder="e.g. Rajesh Kumar"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
              placeholder="+91 XXXXX XXXXX"
              required
            />
          </div>

          {role === 'user' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">EV Make & Model</label>
                <input
                  type="text"
                  value={evModel}
                  onChange={(e) => setEvModel(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                  placeholder="e.g. Tata Nexon EV"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">License Plate</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                  placeholder="e.g. DL 3CA 1234"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                >
                  <option value="van">Service Van</option>
                  <option value="truck">Flatbed Tow Truck</option>
                  <option value="mobile-charger">Mobile Fast Charger</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Capabilities</label>
                <input
                  type="text"
                  value={serviceCapability}
                  onChange={(e) => setServiceCapability(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                  placeholder="e.g. Level 3 CCS2 Fast Charge"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle License Plate</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                  placeholder="e.g. MH 02BD 5678"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-sm transition"
          >
            {loading ? 'Submitting Details...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
