import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  RefreshCw,
  QrCode,
  UserCheck,
  Stethoscope
} from 'lucide-react';

export interface QueueAppointmentTrackerData {
  id?: string;
  token_number: string;
  patient_name: string;
  doctor_name: string;
  department: string;
  room_number: string;
  status: 'booked' | 'checked_in' | 'in_queue' | 'in_consultation' | 'completed';
  queue_position: number;
  estimated_wait_minutes?: number;
}

const QUEUE_STAGES = [
  { id: 'booked', label: 'Booked', description: 'Confirmed by AI receptionist' },
  { id: 'checked_in', label: 'Checked In', description: 'Arrived at hospital kiosk' },
  { id: 'in_queue', label: 'In Waiting Queue', description: 'Assigned to OPD doctor' },
  { id: 'in_consultation', label: 'In Consultation', description: 'Inside consultation room' },
  { id: 'completed', label: 'Completed', description: 'Prescription generated' }
];

interface LiveQueueTrackerProps {
  appointment?: QueueAppointmentTrackerData;
  onOpenQRModal?: () => void;
  onStatusChange?: (updated: QueueAppointmentTrackerData) => void;
}

export const LiveQueueTracker: React.FC<LiveQueueTrackerProps> = ({
  appointment,
  onOpenQRModal,
  onStatusChange
}) => {
  const currentAppt: QueueAppointmentTrackerData = appointment || {
    id: 'e0000000-0000-0000-0000-000000000001',
    token_number: '#MED-4029',
    patient_name: 'Ramesh Kumar',
    doctor_name: 'Dr. Arvind Sharma',
    department: 'General Medicine',
    room_number: 'Room 101',
    status: 'booked',
    queue_position: 2,
    estimated_wait_minutes: 30
  };

  const [apptState, setApptState] = useState<QueueAppointmentTrackerData>(currentAppt);
  const [nowServing, setNowServing] = useState('#MED-1001');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pulseAlert, setPulseAlert] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setApptState(appointment);
    }
  }, [appointment]);

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'booked':
        return 0;
      case 'checked_in':
        return 1;
      case 'in_queue':
        return 2;
      case 'in_consultation':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  };

  const activeStageIndex = getStageIndex(apptState.status);
  const patientsAhead = Math.max(0, (apptState.queue_position || 1) - 1);
  const calculatedWaitMinutes = patientsAhead * 15;

  const handleSimulateCheckIn = () => {
    setIsUpdating(true);
    setTimeout(() => {
      const updated: QueueAppointmentTrackerData = {
        ...apptState,
        status: 'checked_in',
        queue_position: Math.max(1, apptState.queue_position || 2)
      };
      setApptState(updated);
      if (onStatusChange) onStatusChange(updated);
      setIsUpdating(false);
      setPulseAlert('Kiosk Check-In Verified! Queue Position Locked.');
      setTimeout(() => setPulseAlert(null), 4000);
    }, 400);
  };

  const handleSimulateAdvance = () => {
    setIsUpdating(true);
    setTimeout(() => {
      let nextStatus: QueueAppointmentTrackerData['status'] = apptState.status;
      let nextPos = apptState.queue_position;

      if (apptState.status === 'booked') {
        nextStatus = 'checked_in';
        nextPos = 2;
      } else if (apptState.status === 'checked_in') {
        nextStatus = 'in_queue';
        nextPos = 1;
        setNowServing(apptState.token_number);
      } else if (apptState.status === 'in_queue') {
        nextStatus = 'in_consultation';
        nextPos = 0;
        setNowServing(apptState.token_number);
      } else if (apptState.status === 'in_consultation') {
        nextStatus = 'completed';
        nextPos = 0;
      }

      const updated: QueueAppointmentTrackerData = {
        ...apptState,
        status: nextStatus,
        queue_position: nextPos
      };
      setApptState(updated);
      if (onStatusChange) onStatusChange(updated);
      setIsUpdating(false);
      setPulseAlert(`Queue simulation advanced to: ${nextStatus.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => setPulseAlert(null), 3500);
    }, 400);
  };

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 text-slate-900 shadow-card relative font-sans">
      {/* Realtime Notification Banner */}
      {pulseAlert && (
        <div className="mb-6 px-4 py-2.5 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs text-blue-800">
          <span className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            {pulseAlert}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Live Update</span>
        </div>
      )}

      {/* Header & Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Live Queue Tracker
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                Live Sync
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>{apptState.department}</span>
            <span>•</span>
            <span className="text-slate-800 font-bold">
              {apptState.doctor_name} ({apptState.room_number})
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenQRModal && (
            <button
              type="button"
              onClick={onOpenQRModal}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold rounded-xl text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>View Pass</span>
            </button>
          )}

          {apptState.status === 'booked' ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleSimulateCheckIn}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isUpdating ? 'Checking in...' : 'Simulate Kiosk Check-In'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleSimulateAdvance}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Simulate advancing queue step"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>Advance Next Turn</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Status Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        {/* Token # */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Your Token
          </span>
          <div className="text-2xl font-extrabold text-blue-600 font-mono tracking-tight">
            {apptState.token_number}
          </div>
          <span className="text-[11px] text-blue-600 font-bold">Assigned</span>
        </div>

        {/* Now Serving */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Now Serving
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono tracking-tight">
            {nowServing}
          </div>
          <span className="text-[11px] text-slate-500">{apptState.room_number}</span>
        </div>

        {/* Patients Ahead */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Patients Ahead
          </span>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tracking-tight">
            {apptState.status === 'completed' ? 0 : patientsAhead}
          </div>
          <span className="text-[11px] text-slate-500">In Waiting Area</span>
        </div>

        {/* Estimated Wait Time */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
            Est. Wait Time
          </span>
          <div className="text-2xl font-extrabold text-slate-800 font-mono tracking-tight">
            {apptState.status === 'completed' ? '0 min' : `~${calculatedWaitMinutes || 5} min`}
          </div>
          <span className="text-[11px] text-slate-500">~15 min per patient</span>
        </div>
      </div>

      {/* 5-Step Visual Progress Stepper */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-500 mb-6 flex items-center justify-between">
          <span>Consultation Progress</span>
          <span className="text-blue-600 font-mono text-[11px] font-bold">
            Step {activeStageIndex + 1} of {QUEUE_STAGES.length}
          </span>
        </div>

        <div className="relative">
          {/* Progress bar background */}
          <div className="hidden md:block absolute top-5 left-8 right-8 h-1 bg-slate-200 -z-0" />
          {/* Progress bar active fill */}
          <div
            className="hidden md:block absolute top-5 left-8 h-1 bg-blue-600 transition-all duration-500 -z-0"
            style={{
              width: `${(activeStageIndex / (QUEUE_STAGES.length - 1)) * 90}%`
            }}
          />

          {/* Stepper items */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
            {QUEUE_STAGES.map((stage, idx) => {
              const isPast = idx < activeStageIndex;
              const isCurrent = idx === activeStageIndex;

              return (
                <div
                  key={stage.id}
                  className={`flex md:flex-col items-center md:text-center gap-3 md:gap-2 p-2 rounded-2xl transition-all ${
                    isCurrent ? 'bg-blue-50/70 border border-blue-200/80' : ''
                  }`}
                >
                  {/* Circle Icon */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                      isPast
                        ? 'bg-blue-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Text labels */}
                  <div className="text-left md:text-center">
                    <div
                      className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? 'text-blue-700'
                          : isPast
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {stage.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient guidance alert box */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
          <Stethoscope className="w-4 h-4" />
        </div>
        <div className="flex-1 text-slate-700 leading-relaxed">
          {apptState.status === 'booked' && (
            <p>
              Please present your digital pass at the entrance kiosk upon hospital arrival to mark your token 
              as <strong className="text-blue-700 font-bold">Checked In</strong> and join the live waiting queue.
            </p>
          )}
          {apptState.status === 'checked_in' && (
            <p>
              You are checked in! Please proceed to the <strong>{apptState.department} Waiting Area</strong> outside <strong>{apptState.room_number}</strong>. You will be summoned when your token appears on screen.
            </p>
          )}
          {apptState.status === 'in_queue' && (
            <p className="text-amber-800 font-semibold">
              🔔 Your turn is next! Please be ready near the consultation door of <strong>{apptState.room_number}</strong>.
            </p>
          )}
          {apptState.status === 'in_consultation' && (
            <p className="text-emerald-800 font-semibold">
              🩺 Consultation in progress with {apptState.doctor_name}.
            </p>
          )}
          {apptState.status === 'completed' && (
            <p className="text-blue-800 font-semibold">
              ✅ Consultation completed! Digital prescription and medical recommendations are now accessible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveQueueTracker;
