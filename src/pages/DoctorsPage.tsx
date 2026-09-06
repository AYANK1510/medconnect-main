import React, { useState, useEffect } from 'react';
import {
  fetchDoctors,
  fetchDepartments,
  createDoctor,
  updateDoctor,
  toggleDoctorActive,
  createDepartment,
  fetchAppointments,
  updateAppointmentStatus
} from '../services/appointmentService';
import { fetchQueueTokens, updateQueueStatus, callNextPatient } from '../services/queueService';
import type { Doctor, Department, Appointment, QueueToken } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { dbEngine } from '../lib/dbEngine';
import {
  Stethoscope,
  Plus,
  Clock,
  Edit3,
  Power,
  Building2,
  DollarSign,
  Play,
  FileEdit,
  UserX,
  Users,
  Activity,
  HeartPulse,
  Languages,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PrescriptionPad } from '../components/PrescriptionPad';
import { ClinicalGuardrailQueue, type GuardrailItem } from '../components/ClinicalGuardrailQueue';

interface DoctorPatientProfile {
  id: string;
  token_number: string;
  patient_name: string;
  patient_code: string;
  patient_id?: string;
  age: number;
  gender: string;
  phone: string;
  doctor_id: string;
  doctor_name: string;
  slot_time: string;
  status: 'booked' | 'checked_in' | 'in_consultation' | 'completed' | 'no_show';
  queue_position: number;
  symptoms_summary: string;
  detected_language: string;
  vitals: { bp: string; pulse: string; temp: string; spo2: string };
  check_in_time: string | null;
  appointmentId: string;
  tokenId?: string;
}

const SEED_DOCTORS = [
  {
    id: 'd0000000-0000-0000-0001-000000000001',
    name: 'Dr. Arvind Sharma',
    specialization: 'Internal Medicine',
    room_number: 'Room 101',
    department: 'General Medicine',
    reg_no: 'KMC-48209',
    avatar_initials: 'AS'
  },
  {
    id: 'd0000000-0000-0000-0001-000000000002',
    name: 'Dr. Priya Nair',
    specialization: 'Cardiology',
    room_number: 'Room 204',
    department: 'Cardiology',
    reg_no: 'KMC-51920',
    avatar_initials: 'PN'
  },
  {
    id: 'd0000000-0000-0000-0001-000000000003',
    name: 'Dr. Rajesh Rao',
    specialization: 'Orthopedic Surgery',
    room_number: 'Room 112',
    department: 'Orthopedics',
    reg_no: 'KMC-39144',
    avatar_initials: 'RR'
  }
];

export const DoctorsPage: React.FC = () => {
  const { activeHospital } = useAuth();
  const hospitalId = activeHospital?.id || 'hosp-101';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Doctor Consultation Desk State
  const [selectedDoctor, setSelectedDoctor] = useState(SEED_DOCTORS[0]);
  const [activeTab, setActiveTab] = useState<'desk' | 'guardrails' | 'roster' | 'faculty'>('desk');
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Administrative Faculty Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [fee, setFee] = useState(500);
  const [duration, setDuration] = useState(15);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  const loadData = async () => {
    try {
      const docs = await fetchDoctors(hospitalId, true);
      const depts = await fetchDepartments(hospitalId);
      const appts = await fetchAppointments({ hospital_id: hospitalId });
      const tokens = await fetchQueueTokens(hospitalId);
      setDoctors(docs);
      setDepartments(depts);
      setAppointments(appts);
      setQueueTokens(tokens);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, [hospitalId]);

  // Combine fetched appointments and fallback mock profiles into unified doctor patient roster
  const patientRoster: DoctorPatientProfile[] = appointments.map((apt, index) => {
    const token = queueTokens.find((t) => t.appointment_id === apt.id);
    let status: DoctorPatientProfile['status'] = 'booked';
    if (apt.status === 'COMPLETED' || token?.status === 'COMPLETED') {
      status = 'completed';
    } else if (apt.status === 'IN_CONSULTATION' || token?.status === 'CALLED') {
      status = 'in_consultation';
    } else if (apt.status === 'CHECKED_IN' || token?.status === 'CHECKED_IN') {
      status = 'checked_in';
    } else if (apt.status === 'NO_SHOW' || apt.status === 'CANCELLED') {
      status = 'no_show';
    }

    // Distribute doctors evenly
    const doc = SEED_DOCTORS[index % SEED_DOCTORS.length];

    const symptomsList = [
      'Persistent fever, body aches and dry cough for 3 days',
      'Mild knee discomfort, joint stiffness after walking',
      'Hypertension review & routine cardiac medication refill',
      'Seasonal rhinitis & allergic sneeze bouts',
      'Occasional palpitations and shortness of breath upon exertion'
    ];

    const languages = ['Hindi (hi-IN)', 'Tamil (ta-IN)', 'Telugu (te-IN)', 'Kannada (kn-IN)', 'English'];
    const vitalsList = [
      { bp: '118/76', pulse: '82 bpm', temp: '100.4 °F', spo2: '98%' },
      { bp: '130/84', pulse: '76 bpm', temp: '98.6 °F', spo2: '99%' },
      { bp: '142/90', pulse: '80 bpm', temp: '98.4 °F', spo2: '97%' },
      { bp: '112/74', pulse: '72 bpm', temp: '98.2 °F', spo2: '99%' }
    ];

    return {
      id: apt.id,
      token_number: token?.token_number || `#MED-${1000 + index + 1}`,
      patient_name: apt.patient_name,
      patient_code: `DEMO-${String(index + 1).padStart(3, '0')}`,
      patient_id: apt.id,
      age: 30 + (index * 7) % 40,
      gender: index % 2 === 0 ? 'Female' : 'Male',
      phone: apt.patient_phone,
      doctor_id: doc.id,
      doctor_name: doc.name,
      slot_time: apt.appointment_time || '09:00 AM',
      status,
      queue_position: status === 'in_consultation' ? 0 : status === 'checked_in' ? 1 : index + 1,
      symptoms_summary: symptomsList[index % symptomsList.length],
      detected_language: languages[index % languages.length],
      vitals: vitalsList[index % vitalsList.length],
      check_in_time: status !== 'booked' ? '08:48 AM' : null,
      appointmentId: apt.id,
      tokenId: token?.id
    };
  });

  // Doctor-specific roster filter
  const docRoster = patientRoster.filter((p) => p.doctor_name === selectedDoctor.name);
  const activeConsultation = docRoster.find((p) => p.status === 'in_consultation') || null;
  const waitingPatients = docRoster.filter((p) => p.status === 'checked_in' || p.status === 'booked');

  // Action: Call in Next Patient
  const handleCallNextPatient = async () => {
    const nextPatient = waitingPatients[0];
    if (!nextPatient) {
      showToast('No more waiting patients for this doctor today.');
      return;
    }

    if (activeConsultation) {
      if (activeConsultation.tokenId) {
        await updateQueueStatus(activeConsultation.tokenId, 'COMPLETED');
      }
      await updateAppointmentStatus(activeConsultation.appointmentId, 'COMPLETED');
    }

    if (nextPatient.tokenId) {
      await updateQueueStatus(nextPatient.tokenId, 'CALLED');
    } else {
      await callNextPatient(hospitalId);
    }
    await updateAppointmentStatus(nextPatient.appointmentId, 'IN_CONSULTATION');

    showToast(`Called in ${nextPatient.patient_name} (${nextPatient.token_number}) to ${selectedDoctor.room_number}.`);
    await loadData();
  };

  // Action: Mark No-Show
  const handleMarkNoShow = async (patient: DoctorPatientProfile) => {
    if (patient.tokenId) {
      await updateQueueStatus(patient.tokenId, 'CANCELLED');
    }
    await updateAppointmentStatus(patient.appointmentId, 'NO_SHOW');
    showToast(`Marked ${patient.patient_name} (${patient.token_number}) as No-Show.`);
    await loadData();
  };

  // Action: Fast start consultation
  const handleStartConsultation = async (patient: DoctorPatientProfile) => {
    if (activeConsultation) {
      if (activeConsultation.tokenId) {
        await updateQueueStatus(activeConsultation.tokenId, 'COMPLETED');
      }
      await updateAppointmentStatus(activeConsultation.appointmentId, 'COMPLETED');
    }

    if (patient.tokenId) {
      await updateQueueStatus(patient.tokenId, 'CALLED');
    }
    await updateAppointmentStatus(patient.appointmentId, 'IN_CONSULTATION');

    setActiveTab('desk');
    showToast(`Started consultation for ${patient.patient_name} (${patient.token_number}).`);
    await loadData();
  };

  // Action: Guardrail promote to OPD
  const handlePromoteGuardrailToOPD = async (item: GuardrailItem) => {
    showToast(`Promoted ${item.patient_name} to Urgent Priority in OPD queue.`);
    setActiveTab('desk');
  };

  // Action: Faculty CRUD
  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialization(doc.specialization);
    setDepartmentId(doc.department_id || (departments[0]?.id || ''));
    setFee(doc.consultation_fee || 500);
    setDuration(doc.consultation_duration_minutes || 15);
    setStartTime(doc.start_time || '09:00');
    setEndTime(doc.end_time || '17:00');
    setSelectedDays(doc.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setShowAddForm(true);
  };

  const handleResetForm = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialization('');
    setFee(500);
    setDuration(15);
    setStartTime('09:00');
    setEndTime('17:00');
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setShowAddForm(false);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !specialization) return;

    if (editingDoctor) {
      await updateDoctor(editingDoctor.id, {
        name,
        specialization,
        department_id: departmentId || undefined,
        consultation_fee: fee,
        consultation_duration_minutes: duration,
        start_time: startTime,
        end_time: endTime,
        available_days: selectedDays
      });
      showToast(`Updated profile for ${name}`);
    } else {
      await createDoctor({
        hospital_id: hospitalId,
        name,
        specialization,
        department_id: departmentId || undefined,
        consultation_fee: fee,
        consultation_duration_minutes: duration,
        start_time: startTime,
        end_time: endTime,
        available_days: selectedDays,
        is_active: true
      });
      showToast(`Added ${name} to hospital medical team`);
    }

    handleResetForm();
    await loadData();
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    await createDepartment(hospitalId, newDeptName, newDeptDesc);
    setNewDeptName('');
    setNewDeptDesc('');
    setShowDeptModal(false);
    showToast(`Created department: ${newDeptName}`);
    await loadData();
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 text-xs border border-teal-500 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Doctor Identity & Mode Selector Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-card">
        {/* Doctor Info & Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 font-black text-sm flex items-center justify-center border border-teal-200 shrink-0">
            {selectedDoctor.avatar_initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedDoctor.id}
                onChange={(e) => {
                  const doc = SEED_DOCTORS.find((d) => d.id === e.target.value);
                  if (doc) setSelectedDoctor(doc);
                }}
                className="bg-transparent text-sm sm:text-base font-extrabold text-slate-900 focus:outline-none cursor-pointer hover:text-teal-700 transition-colors"
              >
                {SEED_DOCTORS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialization}
                  </option>
                ))}
              </select>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-teal-800 font-bold border border-slate-200">
                {selectedDoctor.room_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reg: {selectedDoctor.reg_no} · {selectedDoctor.department} ·{' '}
              <strong className="text-teal-700">{waitingPatients.length} Waiting Outside</strong>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('desk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'desk'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Consultation Desk</span>
            {activeConsultation && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guardrails')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guardrails'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Clinical Guardrails</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>OPD Roster ({docRoster.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faculty')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'faculty'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Manage Faculty</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CONSULTATION DESK */}
      {activeTab === 'desk' && (
        <div className="space-y-6">
          {/* Active Consultation Card */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-card relative">
            {activeConsultation ? (
              <div className="space-y-6">
                {/* Top Patient Meta Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        In Consultation Now
                      </span>
                      <span className="text-xs font-mono font-semibold text-teal-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {activeConsultation.token_number}
                      </span>
                      <span className="text-xs text-slate-500">
                        Slot: {activeConsultation.slot_time} · Arrived: {activeConsultation.check_in_time || 'Just now'}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {activeConsultation.patient_name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeConsultation.age} yrs · {activeConsultation.gender} · ID: {activeConsultation.patient_code} · Phone: {activeConsultation.phone}
                    </p>
                  </div>

                  {/* Primary Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsPrescriptionModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span>Prescribe Medication</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCallNextPatient}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-teal-300 fill-teal-300" />
                      <span>Complete & Next</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkNoShow(activeConsultation)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
                      title="Mark Patient Absent"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chief Complaint & AI Triage */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Chief Complaint */}
                  <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                        Chief Complaint (AI Transcribed):
                      </span>
                      <span className="text-teal-700 font-medium flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        {activeConsultation.detected_language}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 italic leading-relaxed">
                      "{activeConsultation.symptoms_summary}"
                    </p>
                  </div>

                  {/* Vitals Box */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      <span>Triage Vitals</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">BP</span>
                        <strong className="text-slate-900 font-mono">{activeConsultation.vitals.bp}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Pulse</span>
                        <strong className="text-slate-900 font-mono">{activeConsultation.vitals.pulse}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">SpO2</span>
                        <strong className="text-slate-900 font-mono">{activeConsultation.vitals.spo2}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Temp</span>
                        <strong className="text-slate-900 font-mono">{activeConsultation.vitals.temp}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Prescription Pad Modal / Drawer */}
                {isPrescriptionModalOpen && (
                  <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <PrescriptionPad
                      patient={activeConsultation}
                      appointment={activeConsultation}
                      doctor={selectedDoctor}
                      onPrescriptionIssued={() => {
                        setIsPrescriptionModalOpen(false);
                        handleCallNextPatient();
                      }}
                      onClose={() => setIsPrescriptionModalOpen(false)}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Empty Room State */
              <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 mx-auto flex items-center justify-center">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Consultation Bay Ready</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No patient currently in {selectedDoctor.room_number}. Call the next patient from the waiting bay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCallNextPatient}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Call In Next Patient</span>
                </button>
              </div>
            )}
          </section>

          {/* Upcoming Patients Waiting Outside Room */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Waiting Outside Room ({waitingPatients.length})</span>
              </h3>

              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className="text-xs text-teal-600 hover:underline font-semibold cursor-pointer"
              >
                View Full Day Roster →
              </button>
            </div>

            {waitingPatients.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-400">
                No more patients waiting in line for this session.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {waitingPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-teal-700">
                          {patient.token_number}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {patient.patient_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                        {patient.symptoms_summary}
                      </p>
                      <span className="text-[10px] text-amber-700 font-medium">
                        Slot: {patient.slot_time} · {patient.status === 'checked_in' ? 'Checked in' : 'Booked'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartConsultation(patient)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Call Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: CLINICAL GUARDRAILS */}
      {activeTab === 'guardrails' && (
        <ClinicalGuardrailQueue
          onPromoteToOPD={handlePromoteGuardrailToOPD}
        />
      )}

      {/* TAB 3: OPD ROSTER */}
      {activeTab === 'roster' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Full Day Schedule for {selectedDoctor.name} ({selectedDoctor.room_number})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{docRoster.length} Total Patients</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Token #</th>
                  <th className="py-2.5 px-3">Patient Profile</th>
                  <th className="py-2.5 px-3">Slot Time</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {docRoster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No scheduled patients for this doctor today.
                    </td>
                  </tr>
                ) : (
                  docRoster.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">
                        {patient.token_number}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{patient.patient_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {patient.patient_code} · {patient.phone}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {patient.slot_time}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {patient.status === 'in_consultation' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            IN CONSULTATION
                          </span>
                        ) : patient.status === 'checked_in' ? (
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">
                            WAITING
                          </span>
                        ) : patient.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            COMPLETED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            BOOKED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {patient.status !== 'completed' && patient.status !== 'no_show' && (
                          <button
                            type="button"
                            onClick={() => handleStartConsultation(patient)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MANAGE FACULTY (Administrative CRUD Preserved) */}
      {activeTab === 'faculty' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Hospital Doctor & Faculty Registry
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure OPD medical staff, clinical specialties, consultation schedules, and fees.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowDeptModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Department</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setShowAddForm(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Doctor</span>
              </button>
            </div>
          </div>

          {/* Doctors Listing Grid */}
          {doctors.length === 0 && !loading ? (
            <EmptyState
              title="No doctors registered"
              description="Click 'Add Doctor' to register doctors for appointments."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => {
                const dept = departments.find((d) => d.id === doc.department_id);
                return (
                  <div
                    key={doc.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {doc.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-tight">{doc.name}</h3>
                            <span className="text-xs text-slate-500 font-medium">{doc.specialization}</span>
                          </div>
                        </div>
                        <Badge variant={doc.is_active ? 'green' : 'neutral'} dot>
                          {doc.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dept?.name || 'General OPD'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.start_time} - {doc.end_time} ({doc.consultation_duration_minutes}m slot)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>₹{doc.consultation_fee} Consultation Fee</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleDoctorActive(doc.id);
                          await loadData();
                        }}
                        className={`text-xs font-bold flex items-center space-x-1 cursor-pointer ${
                          doc.is_active ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{doc.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={handleResetForm}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Register New Doctor'}
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Doctor Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Ramesh Gupta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Specialization</label>
              <input
                type="text"
                required
                placeholder="e.g. Cardiologist"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Slot Duration (Mins)</label>
              <input
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shift Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Shift End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Available Days</label>
            <div className="flex flex-wrap gap-1.5">
              {daysOfWeek.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDaySelection(day)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              {editingDoctor ? 'Save Changes' : 'Register Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Department Modal */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title="Create Medical Department"
      >
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Department Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Cardiology, Orthopedics, Pediatrics"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of clinical scope..."
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowDeptModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Create Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DoctorsPage;
