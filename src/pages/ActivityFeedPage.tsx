import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ShieldAlert, Bot, Calendar, Info } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const ActivityFeedPage: React.FC = () => {
  const { activityLogs } = useApp();
  const [filterCat, setFilterCat] = useState<string>('all');

  const categories = ['all', 'appointment', 'emergency', 'system', 'ai'];

  const filteredLogs = filterCat === 'all'
    ? activityLogs
    : activityLogs.filter((l) => l.category === filterCat);

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
            REAL-TIME LOG AUDIT
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Live System Activity Stream
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Real-time audit trail of appointment bookings, 15 km SOS dispatches, and n8n node executions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                filterCat === cat
                  ? 'bg-white text-blue-600 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Log Feed */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-4">
        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No activity events recorded"
            description="There are currently no telemetry logs matching this category."
          />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isEmergency = log.severity === 'emergency';
              const isSuccess = log.severity === 'success';
              const isWarning = log.severity === 'warning';

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    isEmergency
                      ? 'bg-rose-50/50 border-rose-200/80'
                      : isSuccess
                      ? 'bg-emerald-50/50 border-emerald-200/80'
                      : isWarning
                      ? 'bg-amber-50/50 border-amber-200/80'
                      : 'bg-slate-50/50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
                      {log.category === 'emergency' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
                      {log.category === 'appointment' && <Calendar className="w-4 h-4 text-blue-600" />}
                      {log.category === 'ai' && <Bot className="w-4 h-4 text-purple-600" />}
                      {log.category === 'system' && <Info className="w-4 h-4 text-slate-600" />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <h4 className="font-bold text-xs text-slate-900">{log.title}</h4>
                        <Badge
                          variant={isEmergency ? 'emergency' : isSuccess ? 'green' : isWarning ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
                    {log.timestamp}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeedPage;
