import React, { useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface SignupProps {
  onSignupSuccess: (user: any) => void;
  navigate: (path: string) => void;
}

export default function Signup({ onSignupSuccess, navigate }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'provider'>('user');

  // EV Driver Specific
  const [evModel, setEvModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Provider Specific
  const [vehicleType, setVehicleType] = useState('van');
  const [serviceCapability, setServiceCapability] = useState('Level 2 DC Fast Charge');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Password confirmation mismatch.');
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
      setError(signupErr.message || 'Registration failed.');
      return;
    }

    if (data && data.user) {
      onSignupSuccess(data.user);
      if (role === 'provider') {
        navigate('/provider/dashboard');
      } else {
        navigate('/app/home');
      }
    }
  };

  return (
    <div className="min-h-screen bg-skyroot-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#22242A_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="w-2.5 h-2.5 bg-skyroot-accent"></span>
          <span className="font-mono text-sm tracking-[0.3em] font-semibold text-white uppercase">
            GRIDVOLT
          </span>
        </div>
        <h2 className="text-center text-2xl font-light tracking-tight text-white uppercase">
          Enroll New Entity
        </h2>
        <p className="mt-1 text-center text-xs font-mono uppercase tracking-widest text-skyroot-muted">
          Operational Registration System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="skyroot-card p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Role Switcher */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                Select Operational Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`py-2.5 px-4 text-xs font-mono uppercase tracking-wider text-center border transition-all ${
                    role === 'user'
                      ? 'border-skyroot-accent text-white bg-skyroot-accentMuted font-bold'
                      : 'border-skyroot-border text-neutral-400 bg-skyroot-black hover:border-neutral-600'
                  }`}
                >
                  EV Driver (Consumer)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`py-2.5 px-4 text-xs font-mono uppercase tracking-wider text-center border transition-all ${
                    role === 'provider'
                      ? 'border-skyroot-accent text-white bg-skyroot-accentMuted font-bold'
                      : 'border-skyroot-border text-neutral-400 bg-skyroot-black hover:border-neutral-600'
                  }`}
                >
                  Assistance Provider
                </button>
              </div>
            </div>

            {/* Common Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+91 98765 43210"
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Role Attributes */}
            {role === 'user' ? (
              <div className="p-4 border border-skyroot-border bg-skyroot-surface space-y-4">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-skyroot-accent">
                  [TELEMETRY] EV SPECIFICATION
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                      EV Make & Model
                    </label>
                    <input
                      type="text"
                      value={evModel}
                      onChange={(e) => setEvModel(e.target.value)}
                      required
                      placeholder="e.g. Tata Nexon EV Max"
                      className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                      License Plate Number
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      required
                      placeholder="e.g. DL 1C A 1234"
                      className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-skyroot-border bg-skyroot-surface space-y-4">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-skyroot-accent">
                  [FLEET] RESCUE CAPABILITY SPECIFICATION
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                      Carrier Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                    >
                      <option value="van">Service Van</option>
                      <option value="truck">Flatbed Tow Truck</option>
                      <option value="mobile-charger">Mobile Fast Charger</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                      Capability Tag
                    </label>
                    <input
                      type="text"
                      value={serviceCapability}
                      onChange={(e) => setServiceCapability(e.target.value)}
                      required
                      placeholder="e.g. Level 3 CCS2 Fast Charge"
                      className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    Fleet License Plate
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                    placeholder="e.g. MH 02 B D 5678"
                    className="w-full bg-skyroot-black border border-skyroot-border px-3 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'ENROLLING...' : 'REGISTER SPECIFICATIONS'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-neutral-500">Already registered? </span>
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-mono uppercase tracking-wider text-skyroot-accent hover:underline"
            >
              Authorize Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
