import React, { useState } from 'react';

interface CustomerProfileProps {
  user: any;
  navigate: (path: string) => void;
}

export default function CustomerProfile({ user, navigate }: CustomerProfileProps) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [evModel, setEvModel] = useState(user?.ev_model || '');
  const [licensePlate, setLicensePlate] = useState(user?.license_plate || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('gv_token');
      const res = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone,
          ev_model: evModel,
          license_plate: licensePlate,
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();

      const storedUser = localStorage.getItem('gv_user');
      if (storedUser) {
        localStorage.setItem('gv_user', JSON.stringify({ ...JSON.parse(storedUser), name }));
      }

      setMessage('Telemetry specifications updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="mb-8 pb-4 border-b border-skyroot-border">
          <span className="text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase block mb-1">
            OPERATIONAL IDENTITY
          </span>
          <h1 className="text-3xl font-light tracking-tight text-white uppercase">
            Driver & EV Telemetry
          </h1>
        </div>

        <div className="skyroot-card p-8">
          {message && (
            <div className="mb-6 p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
              [SYSTEM CONFIRMED] {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono">
              [SYSTEM ERROR] {error}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Full Driver Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2.5 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  Emergency Phone Contact
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2.5 text-sm text-white font-mono focus:border-skyroot-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border border-skyroot-border bg-skyroot-surface space-y-4">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-skyroot-accent">
                [VEHICLE SPECIFICATION]
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                    EV Make / Model
                  </label>
                  <input
                    type="text"
                    value={evModel}
                    onChange={(e) => setEvModel(e.target.value)}
                    required
                    placeholder="e.g. Tata Nexon EV"
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
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
                    className="w-full bg-skyroot-black border border-skyroot-border px-3.5 py-2 text-xs text-white font-mono focus:border-skyroot-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-skyroot-border">
              <button
                type="button"
                onClick={() => navigate('/app/home')}
                className="text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white"
              >
                ← Back to Console
              </button>

              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50"
              >
                {saving ? 'SYNCHRONIZING...' : 'SAVE SPECIFICATIONS'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
