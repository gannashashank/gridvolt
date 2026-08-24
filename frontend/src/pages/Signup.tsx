import React, { useState } from 'react';
import supabase from '../lib/supabaseClient';

interface SignupProps {
  onSignupSuccess: (user: any) => void;
  navigate: (page: string) => void;
}

export default function Signup({ onSignupSuccess, navigate }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'provider'>('user');

  // EV User specific
  const [evModel, setEvModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Provider specific
  const [vehicleType, setVehicleType] = useState('van');
  const [serviceCapability, setServiceCapability] = useState('Level 2 DC charging');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          role,
          ev_model: role === 'user' ? evModel : null,
          license_plate: licensePlate,
          vehicle_type: role === 'provider' ? vehicleType : null,
          service_capability: role === 'provider' ? serviceCapability : null,
        },
      },
    });

    setLoading(false);

    if (signupErr) {
      setError(signupErr.message || 'Registration failed');
      return;
    }

    if (data && data.user) {
      onSignupSuccess(data.user);
      if (role === 'provider') {
        navigate('provider');
      } else {
        navigate('home');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh] px-4 py-8">
      <div className="w-full max-w-lg glass-panel p-8 rounded-2xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-2xl font-bold mb-3 neon-glow-green">
            ⚡
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="text-slate-400 text-xs mt-1">Join the GridVolt EV Emergency Network</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                placeholder="Rajesh Kumar"
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
                placeholder="+91 98765 43210"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-sm text-slate-200 outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Role selection tab */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Your Role</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-850">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`py-2 text-xs font-bold rounded-md transition ${role === 'user' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                EV Driver (Needs SOS)
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`py-2 text-xs font-bold rounded-md transition ${role === 'provider' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Assistance Provider
              </button>
            </div>
          </div>

          {/* Dynamic Role Fields */}
          {role === 'user' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/10">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">EV Make / Model</label>
                <input
                  type="text"
                  value={evModel}
                  onChange={(e) => setEvModel(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition"
                  placeholder="Tata Nexon EV Max"
                  required={role === 'user'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">License Plate Number</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition"
                  placeholder="DL3CA1234"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition"
                >
                  <option value="van">Service Van</option>
                  <option value="truck">Flatbed Tow Truck</option>
                  <option value="mobile-charger">Mobile Fast Charger</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Capabilities</label>
                <input
                  type="text"
                  value={serviceCapability}
                  onChange={(e) => setServiceCapability(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition"
                  placeholder="Level 3 CCS2 Fast Charge"
                  required={role === 'provider'}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service License Plate</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition"
                  placeholder="MH02BD5678"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-500/10 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Transmitting Registry...' : 'Register Securely'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <button onClick={() => navigate('login')} className="text-emerald-400 hover:underline">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
