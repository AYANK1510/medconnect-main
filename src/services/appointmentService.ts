import { dbEngine, sanitizeSqlInput } from '../lib/dbEngine';
import type { Appointment, QueueToken, Doctor, Department } from '../types/database.types';
import { notifyAppointmentConfirmed } from './notificationService';
import { AppointmentInputSchema, validateInput } from '../utils/validation';
import { AppError } from '../utils/errors';

export async function fetchDoctors(hospitalId?: string, includeInactive: boolean = false): Promise<Doctor[]> {
  return dbEngine.getDoctors(hospitalId, includeInactive);
}

export async function fetchDepartments(hospitalId?: string): Promise<Department[]> {
  return dbEngine.getDepartments(hospitalId);
}

export async function createDepartment(hospitalId: string, name: string, description?: string): Promise<Department> {
  return dbEngine.createDepartment(hospitalId, name, description);
}

export async function createDoctor(docData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>): Promise<Doctor> {
  return dbEngine.createDoctor(docData);
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor> {
  return dbEngine.updateDoctor(id, updates);
}

export async function toggleDoctorActive(id: string): Promise<Doctor> {
  return dbEngine.toggleDoctorActive(id);
}

export async function calculateAvailableSlots(doctorId: string, dateStr: string): Promise<string[]> {
  return dbEngine.calculateAvailableSlots(doctorId, dateStr);
}

export async function createAppointment(data: {
  hospital_id: string;
  department_id?: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}): Promise<{ appointment: Appointment; token: QueueToken }> {
  sanitizeSqlInput(data.patient_name);
  sanitizeSqlInput(data.patient_phone);

  const validation = validateInput(AppointmentInputSchema, {
    patientName: data.patient_name,
    patientPhone: data.patient_phone,
    hospitalId: data.hospital_id,
    doctorId: data.doctor_id,
    date: data.appointment_date,
    timeSlot: data.appointment_time,
  });

  if (!validation.success) {
    throw new AppError('INVALID_INPUT', validation.error.message);
  }

  // Hospital Validation Check
  const hosp = dbEngine.getHospitals().find((h) => h.id === data.hospital_id && h.is_active !== false);
  if (!hosp) {
    throw new AppError('INVALID_INPUT', 'Invalid or inactive hospital specified.');
  }

  // Doctor Availability Check
  const docs = dbEngine.getDoctors(data.hospital_id, true);
  const doc = docs.find((d) => d.id === data.doctor_id);
  if (!doc || doc.is_active === false) {
    throw new AppError('DOCTOR_UNAVAILABLE', 'The selected doctor is currently unavailable or inactive.');
  }

  const result = dbEngine.createAppointment(data);
  const doctorName = doc?.name || 'Doctor';
  
  await notifyAppointmentConfirmed({
    hospitalId: data.hospital_id,
    patientName: data.patient_name,
    patientPhone: data.patient_phone,
    doctorName,
    appointmentDate: data.appointment_date,
    appointmentTime: data.appointment_time,
    tokenNumber: result.token.token_number,
  });

  return result;
}

export async function fetchAppointments(filter?: { hospital_id?: string; patient_phone?: string; date?: string; status?: string }) {
  return dbEngine.getAppointments(filter);
}

export async function getAppointmentById(id: string): Promise<Appointment | undefined> {
  return dbEngine.getAppointmentById(id);
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  return dbEngine.cancelAppointment(appointmentId);
}

export async function updateAppointmentStatus(appointmentId: string, status: import('../types/database.types').AppointmentStatus): Promise<Appointment> {
  return dbEngine.updateAppointmentStatus(appointmentId, status);
}

export async function createAppointmentAsync(data: {
  hospital_id: string;
  department_id?: string;
  doctor_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}): Promise<{ appointment: Appointment; token: QueueToken }> {
  sanitizeSqlInput(data.patient_name);
  sanitizeSqlInput(data.patient_phone);

  const validation = validateInput(AppointmentInputSchema, {
    patientName: data.patient_name,
    patientPhone: data.patient_phone,
    hospitalId: data.hospital_id,
    doctorId: data.doctor_id,
    date: data.appointment_date,
    timeSlot: data.appointment_time,
  });

  if (!validation.success) {
    throw new AppError('INVALID_INPUT', validation.error.message);
  }

  // Doctor Availability Check
  const docs = dbEngine.getDoctors(data.hospital_id, true);
  const doc = docs.find((d) => d.id === data.doctor_id);
  if (!doc || doc.is_active === false) {
    throw new AppError('DOCTOR_UNAVAILABLE', 'The selected doctor is currently unavailable or inactive.');
  }

  const result = await dbEngine.createAppointmentAsync(data);
  const doctorName = doc?.name || 'Doctor';

  await notifyAppointmentConfirmed({
    hospitalId: data.hospital_id,
    patientName: data.patient_name,
    patientPhone: data.patient_phone,
    doctorName,
    appointmentDate: data.appointment_date,
    appointmentTime: data.appointment_time,
    tokenNumber: result.token.token_number,
  });

  return result;
}

