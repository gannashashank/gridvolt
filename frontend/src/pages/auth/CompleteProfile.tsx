import React, { useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface CompleteProfileProps {
  user: any;
  onComplete: () => void;
  navigate: (path: string) => void;
}

export default function CompleteProfile({ user, onComplete, navigate }: CompleteProfileProps) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [evModel, setEvModel] = useState(user?.ev_model || '');
  const [licensePlate, setLicensePlate] = useState(user?.license_plate || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicle_type || 'van');
  const [serviceCapability, setServiceCapability] = useState(user?.service_capability || '');
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
      setError(updateErr.message || 'Profile update failed.');
      return;
    }

    const storedUser = localStorage.getItem('gv_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      localStorage.setItem('gv_user', JSON.stringify({ ...parsed, name }));
    }

    onComplete();
    if (role === 'provider') {
      navigate('/provider/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/app/home');
    }
  };

  return (
    <div className="min-h-screen bg-skyroot-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="w-2.5 h-2.5 bg-skyroot-accent"></span>
          <span className="font-mono text-sm tracking-[0.3em] font-semibold text-white uppercase">
            GRIDVOLT
          </span>
        </div>
        <h2 className="text-center text-2xl font-light tracking-tight text-white uppercase">
          Finalize Credentials
        </h2>
        <p className="mt-1 text-center text-xs font-mono uppercase tracking-widest text-skyroot-muted">
          Mandatory Telemetry Registration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="skyroot-card p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono space-y-2">
              <div>[ERROR] {error}</div>
              {error.toLowerCase().includes('token') && (
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/login');
                  }}
                  className="block w-full py-1.5 px-2 bg-skyroot-accent text-white font-mono text-[10px] uppercase tracking-wider font-bold text-center hover:bg-skyroot-accentHover transition-colors"
                >
                  RE-AUTHORIZE LOGIN SESSION →
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                Display Operator Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                Direct Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
              />
            </div>

            {role === 'user' ? (
              <>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                    EV Make & Model
                  </label>
                  <input
                    type="text"
                    value={evModel}
                    onChange={(e) => setEvModel(e.target.value)}
                    required
                    placeholder="e.g. Tata Nexon EV Max"
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                    placeholder="e.g. DL 1C A 1234"
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                    Carrier Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  >
                    <option value="van">Service Van</option>
                    <option value="truck">Flatbed Tow Truck</option>
                    <option value="mobile-charger">Mobile Fast Charger</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                    Capabilities
                  </label>
                  <input
                    type="text"
                    value={serviceCapability}
                    onChange={(e) => setServiceCapability(e.target.value)}
                    required
                    placeholder="e.g. Level 3 CCS2 Fast Charge"
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1">
                    Carrier License Plate
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    required
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'STORING...' : 'CONFIRM & ENTER SYSTEM'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
