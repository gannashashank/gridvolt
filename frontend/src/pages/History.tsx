import React, { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

interface HistoryProps {
  user: any;
  navigate: (page: string) => void;
}

export default function History({ user, navigate }: HistoryProps) {
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
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setRecords(data || []);
      } catch (err) {
        console.error('Error loading historical service records:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-12">
      <button
        onClick={() => navigate('home')}
        className="text-xs text-slate-400 hover:text-cyan-400 transition mb-6"
      >
        ← Back to Console
      </button>

      <h1 className="text-2xl font-bold text-white mb-2">Assistance Logs</h1>
      <p className="text-xs text-slate-450 mb-8">Past emergency roadside rescues triggered from this account.</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="glass-panel p-8 rounded-xl text-center text-slate-500">
          <span className="text-3xl block mb-2">📂</span>
          <span className="text-xs">No historical assistance records found.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div key={rec.id} className="glass-panel p-6 rounded-xl border border-slate-900 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase px-2 py-0.5 rounded font-mono font-semibold">
                  {rec.service_type || 'Rescue Charge'}
                </span>
                <h3 className="text-base font-bold text-white mt-2">Matched with {rec.provider_name}</h3>
                <p className="text-xs text-slate-450 mt-1 font-mono">
                  Completed on: {new Date(rec.completion_time).toLocaleString()}
                </p>
                {rec.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded border border-slate-900 mt-3 italic">
                    "{rec.notes}"
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-between items-end text-right min-w-[120px]">
                <span className="text-lg font-black text-emerald-400 font-mono">₹{rec.final_cost}</span>
                <div className="text-yellow-400 mt-2 text-sm">
                  {'★'.repeat(rec.rating || 0)}
                  {'☆'.repeat(5 - (rec.rating || 0))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
