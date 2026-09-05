import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ShieldAlert, Bot, Calendar, Info } from 'lucide-react';

export const ActivityFeedPage: React.FC = () => {
  const { activityLogs } = useApp();
  const [filterCat, setFilterCat] = useState<string>('all');

  const categories = ['all', 'appointment', 'emergency', 'system', 'ai'];

  const filteredLogs = filterCat === 'all'
    ? activityLogs
    : activityLogs.filter((l) => l.category === filterCat);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            REAL-TIME LOG AUDIT
          </span>
          <h1 className="text-2xl font-extrabold text-white">Live System Activity Stream</h1>
          <p className="text-xs text-slate-400">
            Real-time audit trail of appointment bookings, 15 km SOS dispatches, and n8n node executions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                filterCat === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Log Feed */}
      <div className="p-6 rounded-3xl glass-panel bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isEmergency = log.severity === 'emergency';
            const isSuccess = log.severity === 'success';
            const isWarning = log.severity === 'warning';

            return (
              <div
                key={log.id}
                className={`p-4 rounded-2xl border transition flex items-start justify-between space-x-4 ${
                  isEmergency
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : isSuccess
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {log.category === 'emergency' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                    {log.category === 'appointment' && <Calendar className="w-4 h-4 text-cyan-400" />}
                    {log.category === 'ai' && <Bot className="w-4 h-4 text-purple-400" />}
                    {log.category === 'system' && <Info className="w-4 h-4 text-blue-400" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-xs text-white">{log.title}</h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase bg-slate-900 border border-slate-800">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-xs opacity-90 leading-relaxed">{log.description}</p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 shrink-0">
                  {log.timestamp}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
