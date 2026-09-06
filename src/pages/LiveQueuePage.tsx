import React, { useState, useEffect } from 'react';
import { fetchQueueTokens, updateQueueStatus } from '../services/queueService';
import type { QueueToken, QueueStatus } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { ListOrdered, UserCheck, Play, XCircle } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { LiveQueueTracker } from '../components/LiveQueueTracker';

export const LiveQueuePage: React.FC = () => {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTokens = async () => {
    try {
      const data = await fetchQueueTokens('hosp-101');
      setTokens(data);
    } finally {
      setLoading(false);
    }
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

  const waitingTokens = tokens.filter((t) => t.status === 'WAITING' || t.status === 'CHECKED_IN');
  const calledToken = tokens.find((t) => t.status === 'CALLED');

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider block">
            OPD RECEPTION & LIVE QUEUE ENGINE
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Live OPD Queue Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Real-time Supabase state sync for patient check-ins, calls, and doctor room routing.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Badge variant="green" dot pulseDot size="md">
            REALTIME ACTIVE
          </Badge>
        </div>
      </div>

      {/* Live Queue Tracker with Progress Stepper and Status Counters */}
      <LiveQueueTracker
        appointment={{
          token_number: calledToken?.token_number || (waitingTokens[0]?.token_number || '#MED-1001'),
          patient_name: calledToken ? 'Anita Sundaram' : (waitingTokens[0] ? 'Ramesh Kumar' : 'Upcoming Patient'),
          doctor_name: 'Dr. Arvind Sharma',
          department: 'General Medicine',
          room_number: 'Room 101',
          status: calledToken ? 'in_consultation' : waitingTokens[0]?.status === 'CHECKED_IN' ? 'checked_in' : 'in_queue',
          queue_position: calledToken ? 0 : waitingTokens.length,
          estimated_wait_minutes: calledToken ? 0 : waitingTokens.length * 15
        }}
        onStatusChange={(updated) => {
          if (calledToken && updated.status === 'completed') {
            handleStatusChange(calledToken.id, 'COMPLETED');
          } else if (waitingTokens[0] && updated.status === 'checked_in') {
            handleStatusChange(waitingTokens[0].id, 'CHECKED_IN');
          } else if (waitingTokens[0] && updated.status === 'in_consultation') {
            handleStatusChange(waitingTokens[0].id, 'CALLED');
          }
        }}
      />

      {/* Queue Token Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">OPD Waiting Queue Records</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {waitingTokens.length} Patients Waiting
          </span>
        </div>

        {loading ? (
          <div className="py-8">
            <LoadingSkeleton variant="table-row" count={3} />
          </div>
        ) : tokens.length === 0 ? (
          <EmptyState
            title="No active queue tokens"
            description="There are no queue tokens generated or waiting in the lobby today."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase text-[10px] bg-slate-50/60">
                  <th className="py-2.5 px-3 sm:px-4 font-semibold">Token #</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold">Sequence</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-3 sm:px-4 font-semibold">Checked In At</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right font-semibold">Receptionist Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold text-blue-600 text-sm">
                      {token.token_number}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-slate-600">
                      #{token.sequence_number}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {token.status === 'CALLED' ? (
                        <Badge variant="warning" dot pulseDot>
                          CALLED
                        </Badge>
                      ) : token.status === 'CHECKED_IN' ? (
                        <Badge variant="blue" dot>
                          CHECKED IN
                        </Badge>
                      ) : token.status === 'COMPLETED' ? (
                        <Badge variant="green" dot>
                          COMPLETED
                        </Badge>
                      ) : (
                        <Badge variant="neutral">{token.status}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-500 font-mono">
                      {token.checked_in_at
                        ? new Date(token.checked_in_at).toLocaleTimeString()
                        : 'Not Checked In'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right space-x-1.5 whitespace-nowrap">
                      {token.status === 'WAITING' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(token.id, 'CHECKED_IN')}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors border border-blue-200/60 inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      )}
                      {(token.status === 'CHECKED_IN' || token.status === 'WAITING') && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(token.id, 'CALLED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg transition-all shadow-xs inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Call Next</span>
                        </button>
                      )}
                      {token.status !== 'COMPLETED' && token.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(token.id, 'CANCELLED')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Cancel token"
                        >
                          <XCircle className="w-3.5 h-3.5" />
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

export default LiveQueuePage;
