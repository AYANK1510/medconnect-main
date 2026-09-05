import React, { useState, useEffect } from 'react';
import { fetchQueueTokens, updateQueueStatus } from '../services/queueService';
import type { QueueToken, QueueStatus } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { ListOrdered, CheckCircle2, PhoneCall, UserCheck, Play, XCircle } from 'lucide-react';

export const LiveQueuePage: React.FC = () => {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTokens = async () => {
    const data = await fetchQueueTokens('hosp-101');
    setTokens(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTokens();
    const unsub = dbEngine.subscribe(() => loadTokens());
    return () => unsub();
  }, []);

  const handleStatusChange = async (tokenId: string, status: QueueStatus) => {
    await updateQueueStatus(tokenId, status);
    await loadTokens();
  };

  const waitingTokens = tokens.filter(t => t.status === 'WAITING' || t.status === 'CHECKED_IN');
  const calledToken = tokens.find(t => t.status === 'CALLED');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            OPD RECEPTION & LIVE QUEUE ENGINE
          </span>
          <h1 className="text-2xl font-extrabold text-white">Live OPD Queue Control Center</h1>
          <p className="text-xs text-slate-400">
            Real-time Supabase state sync for patient check-ins, calls, and doctor room routing.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-lg flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>REALTIME SUBSCRIPTION ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Currently Called Patient Panel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-900 to-slate-900 border border-teal-500/50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <PhoneCall className="w-4 h-4 text-teal-400" />
            <span>Currently Consultation Active in Doctor Room</span>
          </span>
          <span className="text-xs text-slate-400">Doctor Room #104</span>
        </div>

        {calledToken ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 font-mono">TOKEN NUMBER</span>
              <div className="text-4xl font-black font-mono text-white tracking-tight text-teal-300">
                {calledToken.token_number}
              </div>
              <div className="text-xs text-slate-300 mt-1">Status: <span className="font-bold text-emerald-400">IN CONSULTATION</span></div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleStatusChange(calledToken.id, 'COMPLETED')}
                className="px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Consultation Completed</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            No patient currently inside consultation room.{' '}
            {waitingTokens.length > 0 && (
              <span className="text-teal-400 font-semibold">Click "Call Next Patient" below to invite next token.</span>
            )}
          </div>
        )}
      </div>

      {/* Queue Token Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">OPD Waiting Queue Records</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{waitingTokens.length} Patients Waiting</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading live queue state...</div>
        ) : tokens.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No active queue tokens registered today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Sequence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Checked In At</th>
                  <th className="py-3 px-4 text-right">Receptionist Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tokens.map(token => (
                  <tr key={token.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-300 text-sm">
                      {token.token_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      #{token.sequence_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border ${
                        token.status === 'CALLED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        token.status === 'CHECKED_IN' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' :
                        token.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {token.checked_in_at ? new Date(token.checked_in_at).toLocaleTimeString() : 'Not Checked In'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {token.status === 'WAITING' && (
                        <button
                          onClick={() => handleStatusChange(token.id, 'CHECKED_IN')}
                          className="px-3 py-1.5 bg-teal-400/10 border border-teal-500/30 text-teal-300 hover:bg-teal-400 hover:text-slate-950 font-semibold rounded-lg transition-colors inline-flex items-center space-x-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      )}
                      {(token.status === 'CHECKED_IN' || token.status === 'WAITING') && (
                        <button
                          onClick={() => handleStatusChange(token.id, 'CALLED')}
                          className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors inline-flex items-center space-x-1"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Call Next</span>
                        </button>
                      )}
                      {token.status !== 'COMPLETED' && token.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(token.id, 'CANCELLED')}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                          title="Cancel token"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
