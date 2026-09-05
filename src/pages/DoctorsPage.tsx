import React, { useState, useEffect } from 'react';
import {
  fetchDoctors,
  fetchDepartments,
  createDoctor,
  updateDoctor,
  toggleDoctorActive,
  createDepartment,
} from '../services/appointmentService';
import type { Doctor, Department } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { dbEngine } from '../lib/dbEngine';
import { Stethoscope, Plus, Clock, Edit3, Power, Building2, DollarSign, CheckCircle2, UserX } from 'lucide-react';

export const DoctorsPage: React.FC = () => {
  const { activeHospital, activeRole } = useAuth();
  const hospitalId = activeHospital?.id || 'hosp-101';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // UI Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Form State
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

  // Department Modal State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const loadData = async () => {
    // Admins see all doctors (including inactive), others see active
    const docs = await fetchDoctors(hospitalId, true);
    const depts = await fetchDepartments(hospitalId);
    setDoctors(docs);
    setDepartments(depts);
    if (depts[0] && !departmentId) setDepartmentId(depts[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, [hospitalId]);

  const toggleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
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
        department_id: departmentId || null,
        consultation_fee: fee,
        consultation_duration_minutes: duration,
        start_time: startTime,
        end_time: endTime,
        available_days: selectedDays,
      });
    } else {
      await createDoctor({
        hospital_id: hospitalId,
        department_id: departmentId || null,
        name,
        specialization,
        consultation_fee: fee,
        consultation_duration_minutes: duration,
        start_time: startTime,
        end_time: endTime,
        available_days: selectedDays,
        is_active: true,
      });
    }

    handleResetForm();
    await loadData();
  };

  const handleToggleDeactivate = async (docId: string) => {
    await toggleDoctorActive(docId);
    await loadData();
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    await createDepartment(hospitalId, newDeptName, newDeptDesc);
    setNewDeptName('');
    setNewDeptDesc('');
    setShowDeptModal(false);
    await loadData();
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
            FACILITY MANAGEMENT & CLINICIAN DIRECTORY
          </span>
          <h1 className="text-2xl font-extrabold text-white">Doctor & Schedule Management</h1>
          <p className="text-xs text-slate-400">
            Configure physician working hours, department allocations, consultation fees, and real-time slot durations.
          </p>
        </div>

        {activeRole === 'hospital_admin' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDeptModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs flex items-center space-x-2 transition-colors"
            >
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Add Department</span>
            </button>

            <button
              onClick={() => {
                if (showAddForm) handleResetForm();
                else setShowAddForm(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs shadow-lg hover:bg-teal-300 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel' : 'Add New Physician'}</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DOCTOR FORM MODAL */}
      {showAddForm && (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span>{editingDoctor ? `Edit Record: ${editingDoctor.name}` : 'Add New Physician Record'}</span>
            </h3>
            <span className="text-xs text-slate-400">Hospital Admin Authorized</span>
          </div>

          <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Doctor Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="Dr. Vikram Seth"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Specialization *</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={e => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  placeholder="Interventional Cardiology"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Assigned Department</label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Consultation Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={fee}
                    onChange={e => setFee(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-bold text-emerald-400 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Slot Duration (Minutes)</label>
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes (Standard)</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Working Days Selector */}
            <div>
              <label className="block text-slate-300 mb-1.5 font-medium">Working Days Schedule</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(day => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDaySelection(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20"
              >
                {editingDoctor ? 'Save Changes' : 'Create Physician & Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Create New Department</span>
            </h3>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Department Name *</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="e.g. Oncology / Pediatrics"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Description</label>
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={e => setNewDeptDesc(e.target.value)}
                  placeholder="Comprehensive specialized care"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-400 text-slate-950 font-bold rounded-xl shadow-lg"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTORS DIRECTORY GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => {
          const dept = departments.find(d => d.id === doc.department_id);
          return (
            <div
              key={doc.id}
              className={`bg-slate-900 border rounded-2xl p-6 space-y-4 shadow-xl transition-all ${
                doc.is_active ? 'border-slate-800 hover:border-slate-700' : 'border-rose-500/30 opacity-75 bg-slate-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-extrabold text-base overflow-hidden">
                    {doc.avatar_url ? (
                      <img src={doc.avatar_url} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      doc.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <span>{doc.name}</span>
                    </h3>
                    <span className="text-xs text-teal-400 font-medium block">{doc.specialization}</span>
                    {dept && (
                      <span className="text-[10px] text-slate-400 font-mono block">{dept.name}</span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border flex items-center space-x-1 ${
                  doc.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {doc.is_active ? <CheckCircle2 className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                  <span>{doc.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </span>
              </div>

              {/* Details & Schedule */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <DollarSign className="w-3.5 h-3.5 text-teal-400" />
                    <span>Consultation Fee:</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-extrabold">₹{doc.consultation_fee || 500}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Working Hours:</span>
                  </span>
                  <span className="font-mono text-slate-200">
                    {doc.start_time || '09:00'} - {doc.end_time || '17:00'} ({doc.consultation_duration_minutes || 15}m slots)
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Working Days:</span>
                  <div className="flex flex-wrap gap-1">
                    {(doc.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).map(d => (
                      <span key={d} className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 rounded">
                        {d.substring(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {activeRole === 'hospital_admin' && (
                <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenEdit(doc)}
                    className="flex-1 py-1.5 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Edit Doctor</span>
                  </button>

                  <button
                    onClick={() => handleToggleDeactivate(doc.id)}
                    className={`py-1.5 px-3 border text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors ${
                      doc.is_active
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{doc.is_active ? 'Deactivate' : 'Activate'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
