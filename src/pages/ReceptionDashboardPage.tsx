import React, { useState, useEffect } from 'react';
import {
  Building2,
  QrCode,
  Stethoscope,
  PhoneCall,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  XCircle,
  Play
} from 'lucide-react';
import { fetchAppointments, updateAppointmentStatus } from '../services/appointmentService';
import { fetchQueueTokens, updateQueueStatus, callNextPatient } from '../services/queueService';
import type { Appointment, QueueToken } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import { QRScannerKiosk, type VerifiedPassData } from '../components/QRScannerKiosk';

const DEPARTMENTS = ['All', 'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Emergency'];

interface UnifiedRosterItem {
  id: string;
  token_number: string;
  patient_name: string;
  patient_code: string;
  patient_phone: string;
  department: string;
  doctor_name: string;
  room_number: string;
  slot_time: string;
  check_in_time: string | null;
  status: 'booked' | 'checked_in' | 'in_consultation' | 'completed' | 'no_show';
  queue_position: number;
  estimated_wait_minutes: number;
  symptoms_summary: string;
  appointmentId: string;
  tokenId?: string;
}

export const ReceptionDashboardPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const appts = await fetchAppointments({ hospital_id: 'hosp-101' });
      const tokens = await fetchQueueTokens('hosp-101');
      setAppointments(appts);
      setQueueTokens(tokens);
    } catch (e) {
      console.error('Failed to load reception data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, []);

  // Map database records into unified roster matching Source schema
  const roster: UnifiedRosterItem[] = appointments.map((apt, index) => {
    const token = queueTokens.find((t) => t.appointment_id === apt.id);
    let status: UnifiedRosterItem['status'] = 'booked';
    if (apt.status === 'COMPLETED' || token?.status === 'COMPLETED') {
      status = 'completed';
    } else if (apt.status === 'IN_CONSULTATION' || token?.status === 'CALLED') {
      status = 'in_consultation';
    } else if (apt.status === 'CHECKED_IN' || token?.status === 'CHECKED_IN') {
      status = 'checked_in';
    } else if (apt.status === 'NO_SHOW' || apt.status === 'CANCELLED') {
      status = 'no_show';
    } else {
      status = 'booked';
    }

    // Default doctors & rooms if not populated
    const deptList = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Emergency'];
    const dept = deptList[index % deptList.length];
    const docMap: Record<string, { name: string; room: string }> = {
      'General Medicine': { name: 'Dr. Arvind Sharma', room: 'Room 101' },
      'Cardiology': { name: 'Dr. Priya Nair', room: 'Room 204' },
      'Orthopedics': { name: 'Dr. Rajesh Rao', room: 'Room 112' },
      'Pediatrics': { name: 'Dr. Ananya Roy', room: 'Room 108' },
      'Emergency': { name: 'Dr. Vikram Seth', room: 'ER Bay 1' }
    };

    return {
      id: apt.id,
      token_number: token?.token_number || `#MED-${1000 + index + 1}`,
      patient_name: apt.patient_name,
      patient_code: `DEMO-${String(index + 1).padStart(3, '0')}`,
      patient_phone: apt.patient_phone,
      department: dept,
      doctor_name: docMap[dept]?.name || 'Dr. On Duty',
      room_number: docMap[dept]?.room || 'Room 104',
      slot_time: apt.appointment_time || '09:00 AM',
      check_in_time: status !== 'booked' ? '08:48 AM' : null,
      status,
      queue_position: status === 'checked_in' ? 1 : status === 'booked' ? index + 1 : 0,
      estimated_wait_minutes: status === 'checked_in' ? 5 : status === 'booked' ? 15 * (index + 1) : 0,
      symptoms_summary: 'Persistent fever, mild fatigue, and cough reported during preliminary intake.',
      appointmentId: apt.id,
      tokenId: token?.id
    };
  });

  // Action: Mark Checked In
  const handleMarkCheckedIn = async (item: UnifiedRosterItem) => {
    if (item.tokenId) {
      await updateQueueStatus(item.tokenId, 'CHECKED_IN');
    }
    await updateAppointmentStatus(item.appointmentId, 'CHECKED_IN');
    showToast(`Marked ${item.patient_name} (${item.token_number}) as Checked In`);
    await loadData();
  };

  // Action: Call Patient
  const handleCallPatient = async (item: UnifiedRosterItem) => {
    if (item.tokenId) {
      await updateQueueStatus(item.tokenId, 'CALLED');
    } else {
      await callNextPatient('hosp-101');
    }
    await updateAppointmentStatus(item.appointmentId, 'IN_CONSULTATION');
    showToast(`Calling ${item.patient_name} (${item.token_number}) to ${item.room_number}!`);
    await loadData();
  };

  // Action: Complete Consultation
  const handleCompleteConsultation = async (item: UnifiedRosterItem) => {
    if (item.tokenId) {
      await updateQueueStatus(item.tokenId, 'COMPLETED');
    }
    await updateAppointmentStatus(item.appointmentId, 'COMPLETED');
    showToast(`Consultation for ${item.token_number} marked Completed`);
    await loadData();
  };

  // Action: Mark No-Show
  const handleMarkNoShow = async (item: UnifiedRosterItem) => {
    if (item.tokenId) {
      await updateQueueStatus(item.tokenId, 'CANCELLED');
    }
    await updateAppointmentStatus(item.appointmentId, 'NO_SHOW');
    showToast(`${item.token_number} marked as No-Show / Cancelled`);
    await loadData();
  };

  // Handle Scanner verification
  const handleScanSuccess = async (passData: VerifiedPassData) => {
    setIsScannerOpen(false);
    showToast(`QR Verified: ${passData.token_number} (${passData.patient_name}) Checked In!`);
    await loadData();
  };

  // Filtering
  const filteredRoster = roster.filter((item) => {
    const matchesDept = selectedDept === 'All' || item.department === selectedDept;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
    const matchesSearch =
      searchQuery === '' ||
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.token_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesStatus && matchesSearch;
  });

  // KPI Counters
  const totalCount = roster.length;
  const bookedCount = roster.filter((r) => r.status === 'booked').length;
  const checkedInCount = roster.filter((r) => r.status === 'checked_in').length;
  const inConsultationCount = roster.filter((r) => r.status === 'in_consultation').length;

  // Next patient needing call
  const nextReadyPatient = roster.find((r) => r.status === 'checked_in') || roster.find((r) => r.status === 'booked');

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-500 text-slate-950 px-4 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 text-xs border border-teal-400 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* QR Scanner Kiosk Modal */}
      {isScannerOpen && (
        <QRScannerKiosk
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
          hospitalId="hosp-101"
        />
      )}

      {/* Section Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Reception Intake & Live Queue
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700">
              Front Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Verify incoming patient digital QR passes, manage walk-ins, and orchestrate room calls.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Patient Pass</span>
          </button>
        </div>
      </div>

      {/* Operational Status Metrics (4 KPI cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-card">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Scheduled</span>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{totalCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-card">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Awaiting Arrival</span>
            <div className="text-xl font-bold text-amber-600 font-mono mt-0.5">{bookedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-card">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Checked In (Waiting)</span>
            <div className="text-xl font-bold text-teal-600 font-mono mt-0.5">{checkedInCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center text-xs">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-card">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">In Consultation</span>
            <div className="text-xl font-bold text-emerald-600 font-mono mt-0.5">{inConsultationCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-xs">
            <Stethoscope className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Priority Banner: Next Ready Patient */}
      {nextReadyPatient && (
        <div className="bg-white border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-900">Next Patient Ready to Call:</span>
                <span className="text-xs font-mono font-bold text-teal-700">{nextReadyPatient.token_number}</span>
                <span className="text-xs font-medium text-slate-600">({nextReadyPatient.patient_name})</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target: {nextReadyPatient.department} · {nextReadyPatient.doctor_name} ({nextReadyPatient.room_number})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCallPatient(nextReadyPatient)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call to {nextReadyPatient.room_number}</span>
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-card">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, token (#MED-XXXX), or code..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-teal-600" /> Dept:
          </span>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                selectedDept === dept
                  ? 'bg-teal-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="All">All Statuses ({roster.length})</option>
            <option value="booked">Booked (Awaiting)</option>
            <option value="checked_in">Checked In</option>
            <option value="in_consultation">In Consultation</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Live Queue Roster Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Token #</th>
                <th className="py-3 px-4">Patient Profile</th>
                <th className="py-3 px-4">Department & Doctor</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4 text-center">Queue</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No appointments matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((appt) => {
                  const isExpanded = expandedPatientId === appt.id;
                  return (
                    <React.Fragment key={appt.id}>
                      <tr
                        className={`hover:bg-slate-50 transition-colors ${
                          appt.status === 'checked_in' ? 'bg-teal-50/30' : ''
                        }`}
                      >
                        {/* Token & Expand Toggle */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setExpandedPatientId(isExpanded ? null : appt.id)}
                            className="font-mono font-bold text-teal-600 hover:underline flex items-center gap-1.5 cursor-pointer"
                            title="Click to view details & symptoms"
                          >
                            <span>{appt.token_number}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Patient Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{appt.patient_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {appt.patient_code} · {appt.patient_phone}
                          </div>
                        </td>

                        {/* Department & Doctor */}
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{appt.department}</div>
                          <div className="text-[11px] text-teal-600">
                            {appt.doctor_name} ({appt.room_number})
                          </div>
                        </td>

                        {/* Slot Time */}
                        <td className="py-3 px-4">
                          <div className="text-slate-700">{appt.slot_time}</div>
                          <div className="text-[10px] text-slate-400">
                            {appt.check_in_time ? `Arrived: ${appt.check_in_time}` : 'Not checked in'}
                          </div>
                        </td>

                        {/* Queue Position */}
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {appt.status === 'completed' ? (
                            <span className="text-slate-400">-</span>
                          ) : appt.status === 'in_consultation' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                              NOW
                            </span>
                          ) : (
                            <span className="text-amber-600">#{appt.queue_position || 1}</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {appt.status === 'booked' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Booked
                            </span>
                          )}
                          {appt.status === 'checked_in' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                              Checked In
                            </span>
                          )}
                          {appt.status === 'in_consultation' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <Stethoscope className="w-3 h-3" />
                              In Room
                            </span>
                          )}
                          {appt.status === 'completed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Completed
                            </span>
                          )}
                          {appt.status === 'no_show' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              No-Show
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {appt.status === 'booked' && (
                            <button
                              type="button"
                              onClick={() => handleMarkCheckedIn(appt)}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Check In
                            </button>
                          )}
                          {appt.status === 'checked_in' && (
                            <button
                              type="button"
                              onClick={() => handleCallPatient(appt)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PhoneCall className="w-3 h-3" />
                              Call Patient
                            </button>
                          )}
                          {appt.status === 'in_consultation' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteConsultation(appt)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {appt.status !== 'completed' && appt.status !== 'no_show' && (
                            <button
                              type="button"
                              onClick={() => handleMarkNoShow(appt)}
                              className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Mark No-Show / Cancel"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                  Patient Background
                                </span>
                                <div className="text-slate-800 font-medium">
                                  {appt.patient_name} ({appt.patient_code})
                                </div>
                                <div className="text-slate-500 font-mono">{appt.patient_phone}</div>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                  Triage & Symptoms
                                </span>
                                <p className="text-slate-700">{appt.symptoms_summary}</p>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                    Queue Estimation
                                  </span>
                                  <div className="text-slate-800 font-mono font-bold">
                                    {appt.estimated_wait_minutes === 0
                                      ? 'Immediate'
                                      : `~${appt.estimated_wait_minutes} mins wait`}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCallPatient(appt)}
                                    className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span>Fast Call</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
