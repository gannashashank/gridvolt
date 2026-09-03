import React, { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';

interface AdminUsersProps {
  user: any;
  navigate: (path: string) => void;
}

export default function AdminUsers({ user, navigate }: AdminUsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('gv_token');
        const res = await fetch('/api/profiles?role=user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data || []);
        }
      } catch (err) {
        console.error('Failed to load user accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.ev_model && u.ev_model.toLowerCase().includes(q)) ||
      (u.license_plate && u.license_plate.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-skyroot-border gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase mb-1">
              <span className="w-2 h-2 bg-skyroot-accent"></span>
              <span>ADMINISTRATIVE REGISTRY</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Registered EV Drivers
            </h1>
          </div>

          <div className="w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH DRIVER, EV, PLATE..."
              className="w-full bg-skyroot-card border border-skyroot-border px-3.5 py-2 text-xs font-mono text-white uppercase tracking-wider focus:border-skyroot-accent focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-skyroot-muted">
            QUERYING DRIVER DIRECTORY...
          </div>
        ) : (
          <div className="skyroot-card overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-skyroot-border text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Driver Profile</th>
                  <th className="p-4">Emergency Contact</th>
                  <th className="p-4">EV Model</th>
                  <th className="p-4">License Plate</th>
                  <th className="p-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skyroot-border/60">
                {filteredUsers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-skyroot-cardHover transition-colors">
                    <td className="p-4 font-medium text-white">{driver.name || 'Unnamed Driver'}</td>
                    <td className="p-4 text-skyroot-accent">{driver.phone || '—'}</td>
                    <td className="p-4 text-neutral-300">{driver.ev_model || 'Standard EV'}</td>
                    <td className="p-4 text-neutral-300">{driver.license_plate || '—'}</td>
                    <td className="p-4 text-neutral-500">
                      {new Date(driver.created_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-500 uppercase tracking-wider">
                      No matching EV driver profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
