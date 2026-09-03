import React, { useEffect, useState } from 'react';

interface ProviderHistoryProps {
  user: any;
  navigate: (path: string) => void;
}

export default function ProviderHistory({ user, navigate }: ProviderHistoryProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('gv_token');
        const res = await fetch('/api/service-records', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to retrieve history');
        const data = await res.json();
        setRecords(data || []);
      } catch (err) {
        console.error('Error fetching provider records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const totalEarnings = records.reduce((acc, r) => acc + (parseFloat(r.final_cost) || 0), 0);
  const avgRating =
    records.length > 0
      ? (
          records.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0) / records.length
        ).toFixed(1)
      : '5.0';

  return (
    <div className="bg-skyroot-black min-h-screen text-white pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-skyroot-border">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-skyroot-accent uppercase block mb-1">
              MISSION ARCHIVES
            </span>
            <h1 className="text-3xl font-light tracking-tight text-white uppercase">
              Completed Dispatches
            </h1>
          </div>
          <span className="text-xs font-mono text-skyroot-muted uppercase tracking-widest mt-2 sm:mt-0">
            TOTAL EARNINGS: ₹{totalEarnings.toFixed(2)}
          </span>
        </div>

        {/* Quick Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="skyroot-card p-5">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              MISSIONS FULFILLED
            </span>
            <span className="text-2xl font-mono text-white mt-1 block">
              {records.length} MISSIONS
            </span>
          </div>
          <div className="skyroot-card p-5">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              CUSTOMER RATING
            </span>
            <span className="text-2xl font-mono text-amber-400 mt-1 block">
              ★ {avgRating} / 5.0
            </span>
          </div>
          <div className="skyroot-card p-5">
            <span className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase block">
              SETTLED REVENUE
            </span>
            <span className="text-2xl font-mono text-emerald-400 mt-1 block">
              ₹{totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-skyroot-muted">
            SYNCHRONIZING FLEET RECORDS...
          </div>
        ) : records.length === 0 ? (
          <div className="skyroot-card p-12 text-center">
            <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest block mb-2">
              NO COMPLETED RESCUES LOGGED
            </span>
            <p className="text-sm text-neutral-400 font-light mb-6">
              When you accept and finish roadside dispatches, settlement records will be archived here.
            </p>
            <button
              onClick={() => navigate('/provider/dashboard')}
              className="px-6 py-2.5 bg-skyroot-accent hover:bg-skyroot-accentHover text-white font-mono text-xs uppercase tracking-widest font-bold"
            >
              RETURN TO RADAR
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="skyroot-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-skyroot-surface border border-skyroot-border text-emerald-400">
                      SETTLED
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      MISSION REF #{rec.id}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-white uppercase">
                    Service to {rec.user_name || 'EV Driver'}
                  </h3>

                  <div className="text-xs font-mono text-neutral-400 space-x-4">
                    <span>DATE: {new Date(rec.completion_time).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>TYPE: {rec.service_type || 'Charging'}</span>
                  </div>

                  {rec.notes && (
                    <p className="text-xs text-neutral-300 font-light italic bg-skyroot-black/60 p-3 border border-skyroot-border/60 mt-2">
                      "{rec.notes}"
                    </p>
                  )}
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-skyroot-border">
                  <div className="text-2xl font-mono text-emerald-400 font-light">
                    ₹{rec.final_cost}
                  </div>
                  <div className="text-skyroot-accent font-mono text-xs mt-1">
                    {'★'.repeat(rec.rating || 0)}
                    <span className="text-neutral-600">{'★'.repeat(5 - (rec.rating || 0))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
