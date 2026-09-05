import React, { useState, useEffect } from 'react';
import { fetchAppointments, updateAppointmentStatus } from '../services/appointmentService';
import { fetchQueueTokens, updateQueueStatus, callNextPatient } from '../services/queueService';
import type { Appointment, QueueToken } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { Stethoscope, Users, Clock, Play, ListOrdered, Bot, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export const ReceptionDashboardPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);

  const loadData = async () => {
    const appts = await fetchAppointments({ hospital_id: 'hosp-101' });
    const tokens = await fetchQueueTokens('hosp-101');
    setAppointments(appts);
    setQueueTokens(tokens);
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, []);

  const calledToken = queueTokens.find(q => q.status === 'CALLED');
  const waitingTokens = queueTokens.filter(q => q.status === 'WAITING' || q.status === 'CHECKED_IN');

  const handleAdvance = async () => {
    await callNextPatient('hosp-101');
    await loadData();
  };

  const handleCheckIn = async (tokenId: string) => {
    await updateQueueStatus(tokenId, 'CHECKED_IN');
    await loadData();
  };

  const handleComplete = async (tokenId: string) => {
    await updateQueueStatus(tokenId, 'COMPLETED');
    await loadData();
  };

  const handleNoShow = async (apptId: string, tokenId?: string) => {
    await updateAppointmentStatus(apptId, 'NO_SHOW');
    if (tokenId) {
      await updateQueueStatus(tokenId, 'CANCELLED');
    }
    await loadData();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            HOSPITAL FRONT DESK CONTROL
          </span>
          <h1 className="text-2xl font-extrabold text-white">OPD Reception & Queue Control Desk</h1>
          <p className="text-xs text-slate-400">
            Manage patient check-ins, call next consultation token, and monitor queue state in real time.
          </p>
        </div>

        <button
          onClick={handleAdvance}
          disabled={waitingTokens.length === 0 && !calledToken}
          className="px-4 py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs shadow-lg hover:bg-teal-300 transition flex items-center space-x-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 text-slate-950 fill-current" />
          <span>Advance Queue (Call Next Token)</span>
        </button>
      </div>

      {/* OPD Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span>Currently Serving</span>
            <Stethoscope className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-300 mt-2 font-mono">
            {calledToken ? calledToken.token_number : 'None'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Room #104 Active</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span>Waiting Patients</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {waitingTokens.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">In Reception Lobby</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span>Est. Avg Wait Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
            ~{waitingTokens.length * 15} <span className="text-xs">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Realtime Algorithm</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-start text-xs text-slate-400">
            <span>AI Voice Intake</span>
            <Bot className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 mt-2 font-mono">
            Sarvam AI
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Multilingual Speech STT</div>
        </div>
      </div>

      {/* OPD Queue Control Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-teal-400" />
            <span>Today's OPD Appointment Register</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{appointments.length} Total Registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Patient Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Token #</th>
                <th className="py-2.5 px-3">Time Slot</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {appointments.map((apt) => {
                const token = queueTokens.find(t => t.appointment_id === apt.id);
                return (
                  <tr key={apt.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white">{apt.patient_name}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{apt.patient_phone}</td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-300">{token?.token_number || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono text-teal-300">{apt.appointment_time}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          apt.status === 'IN_CONSULTATION' || token?.status === 'CALLED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : apt.status === 'CHECKED_IN' || token?.status === 'CHECKED_IN'
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                            : apt.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : apt.status === 'NO_SHOW' || apt.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {token && token.status === 'WAITING' && (
                        <button
                          onClick={() => handleCheckIn(token.id)}
                          className="px-2.5 py-1 bg-teal-400/10 border border-teal-500/30 text-teal-300 hover:bg-teal-400 hover:text-slate-950 font-semibold rounded-lg transition"
                        >
                          <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                          Check In
                        </button>
                      )}
                      {token && (token.status === 'CHECKED_IN' || token.status === 'WAITING') && (
                        <button
                          onClick={() => updateQueueStatus(token.id, 'CALLED').then(loadData)}
                          className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition"
                        >
                          <Play className="w-3.5 h-3.5 inline mr-1" />
                          Call Next
                        </button>
                      )}
                      {token && token.status === 'CALLED' && (
                        <button
                          onClick={() => handleComplete(token.id)}
                          className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                          Complete
                        </button>
                      )}
                      {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && apt.status !== 'NO_SHOW' && (
                        <button
                          onClick={() => handleNoShow(apt.id, token?.id)}
                          className="px-2 py-1 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-semibold rounded-lg transition"
                          title="Mark No-Show / Skip"
                        >
                          <XCircle className="w-3.5 h-3.5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
