import type {
  Profile, Hospital, Doctor, Department, Patient,
  Appointment, QueueToken, InventoryItem, EmergencyRequest,
  EmergencyMatch, Dispatch, Notification, ActivityLog,
  UserRole, QueueStatus, EmergencyUrgency, ResourceReservation,
  DispatchStatus
} from '../types/database.types';

// Haversine formula calculation in kilometers (Earth radius: 6371 km)
export function calculateDistanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  if (
    lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
  ) {
    throw new Error('Invalid hospital location coordinates.');
  }

  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180 || (lat1 === 0 && lon1 === 0)) {
    throw new Error('Invalid hospital location coordinates.');
  }

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function calculateHaversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
}

/**
 * Phase 16 — SQL Injection Prevention & String Sanitization
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  const dangerousPatterns = [
    /'\s*OR\s*'\s*1\s*=\s*'1/i,
    /;\s*DROP\s+TABLE/i,
    /;\s*DELETE\s+FROM/i,
    /UNION\s+SELECT/i,
    /--/,
    /\/\*/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) {
      throw new Error('SQL_INJECTION_RISK: Malicious SQL patterns detected in input.');
    }
  }

  return input;
}

/**
 * Phase 16 — Authorization & Hospital Scope Check
 */
export function checkHospitalAccess(userHospitalId?: string | null, targetHospitalId?: string | null): boolean {
  if (!userHospitalId || !targetHospitalId) return true; // Unrestricted / public
  return userHospitalId === targetHospitalId;
}

/**
 * Phase 16 — Inventory Modification Permission Check
 */
export function checkInventoryPermission(role?: UserRole | null, userHospitalId?: string | null, targetHospitalId?: string | null): boolean {
  if (!role) return false;
  if (!['er_staff', 'hospital_admin'].includes(role)) return false;
  if (userHospitalId && targetHospitalId && userHospitalId !== targetHospitalId) return false;
  return true;
}


// Initial Database Seed Data for Development Mode
const INITIAL_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-101',
    name: 'Metro City General Hospital',
    address: '452 Healthcare Boulevard, Sector 4',
    latitude: 28.6139,
    longitude: 77.2090,
    phone: '+91-11-23456789',
    emergency_contact: '+91-11-99990001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hosp-102',
    name: 'St. Jude Memorial Hospital',
    address: '88 Ring Road, Sector 12',
    latitude: 28.5672,
    longitude: 77.2400,
    phone: '+91-11-23456790',
    emergency_contact: '+91-11-99990002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'hosp-103',
    name: 'Apex Trauma & Critical Care Center',
    address: '12 Expressway Link, Zone 3',
    latitude: 28.6500,
    longitude: 77.2300,
    phone: '+91-11-23456791',
    emergency_contact: '+91-11-99990003',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-1', hospital_id: 'hosp-101', name: 'Cardiology', description: 'Heart & Vascular Care', created_at: new Date().toISOString() },
  { id: 'dept-2', hospital_id: 'hosp-101', name: 'Orthopedics', description: 'Bones & Joints', created_at: new Date().toISOString() },
  { id: 'dept-3', hospital_id: 'hosp-101', name: 'General Medicine', description: 'Primary & Internal Care', created_at: new Date().toISOString() },
  { id: 'dept-4', hospital_id: 'hosp-101', name: 'Neurology', description: 'Brain & Nervous System', created_at: new Date().toISOString() },
  { id: 'dept-5', hospital_id: 'hosp-101', name: 'Dermatology', description: 'Skin & Cutaneous Care', created_at: new Date().toISOString() },
  { id: 'dept-6', hospital_id: 'hosp-101', name: 'Pediatrics', description: 'Child & Infant Care', created_at: new Date().toISOString() }
];

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    hospital_id: 'hosp-101',
    department_id: 'dept-1',
    name: 'Dr. Rajesh Sharma',
    specialization: 'Senior Cardiologist',
    consultation_fee: 750,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '09:00',
    end_time: '18:00',
    consultation_duration_minutes: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-2',
    hospital_id: 'hosp-101',
    department_id: 'dept-2',
    name: 'Dr. Priya Ananth',
    specialization: 'Orthopedic Surgeon',
    consultation_fee: 700,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '10:00',
    end_time: '18:00',
    consultation_duration_minutes: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-3',
    hospital_id: 'hosp-101',
    department_id: 'dept-3',
    name: 'Dr. Amit Patel',
    specialization: 'Internal Medicine & Physician',
    consultation_fee: 500,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '08:30',
    end_time: '18:00',
    consultation_duration_minutes: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-4',
    hospital_id: 'hosp-101',
    department_id: 'dept-5',
    name: 'Dr. Sunita Rao',
    specialization: 'Consultant Dermatologist',
    consultation_fee: 650,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '09:00',
    end_time: '18:00',
    consultation_duration_minutes: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-5',
    hospital_id: 'hosp-101',
    department_id: 'dept-4',
    name: 'Dr. Vikram Malhotra',
    specialization: 'Senior Neurologist',
    consultation_fee: 800,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '09:30',
    end_time: '18:00',
    consultation_duration_minutes: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-6',
    hospital_id: 'hosp-101',
    department_id: 'dept-6',
    name: 'Dr. Ananya Roy',
    specialization: 'Pediatric Specialist',
    consultation_fee: 600,
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    start_time: '10:00',
    end_time: '18:00',
    consultation_duration_minutes: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', hospital_id: 'hosp-101', resource_type: 'Blood', item_name: 'O- Negative Blood', name: 'O- Negative Blood', subtype: 'O-', total_quantity: 8, reserved_quantity: 0, available_quantity: 8, unit: 'units', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-2', hospital_id: 'hosp-101', resource_type: 'Blood', item_name: 'O+ Positive Blood', name: 'O+ Positive Blood', subtype: 'O+', total_quantity: 24, reserved_quantity: 0, available_quantity: 24, unit: 'units', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-3', hospital_id: 'hosp-101', resource_type: 'Oxygen', item_name: 'Medical Oxygen Cylinders', name: 'Medical Oxygen Cylinders', subtype: 'Type D', total_quantity: 32, reserved_quantity: 0, available_quantity: 32, unit: 'cylinders', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-4', hospital_id: 'hosp-101', resource_type: 'ICU Bed', item_name: 'ICU Beds with Ventilator', name: 'ICU Beds with Ventilator', subtype: 'Advanced', total_quantity: 5, reserved_quantity: 0, available_quantity: 5, unit: 'beds', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  { id: 'inv-5', hospital_id: 'hosp-102', resource_type: 'Blood', item_name: 'O- Negative Blood', name: 'O- Negative Blood', subtype: 'O-', total_quantity: 12, reserved_quantity: 0, available_quantity: 12, unit: 'units', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'inv-6', hospital_id: 'hosp-102', resource_type: 'Oxygen', item_name: 'Medical Oxygen Cylinders', name: 'Medical Oxygen Cylinders', subtype: 'Type D', total_quantity: 18, reserved_quantity: 0, available_quantity: 18, unit: 'cylinders', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  { id: 'inv-7', hospital_id: 'hosp-103', resource_type: 'ICU Bed', item_name: 'ICU Beds with Ventilator', name: 'ICU Beds with Ventilator', subtype: 'Advanced', total_quantity: 3, reserved_quantity: 0, available_quantity: 3, unit: 'beds', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export function normalizeTimeSlot(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match) {
    let [_, hStr, mStr, period] = match;
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period) {
      const pUpper = period.toUpperCase();
      if (pUpper === 'PM' && h < 12) h += 12;
      if (pUpper === 'AM' && h === 12) h = 0;
    }
    const finalPeriod = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${finalPeriod}`;
  }
  return trimmed;
}

class LocalRelationalEngine {
  private profiles: Profile[] = [];
  private hospitals: Hospital[] = INITIAL_HOSPITALS;
  private departments: Department[] = INITIAL_DEPARTMENTS;
  private doctors: Doctor[] = INITIAL_DOCTORS;
  private patients: Patient[] = [];
  private appointments: Appointment[] = [];
  private queueTokens: QueueToken[] = [];
  private inventory: InventoryItem[] = INITIAL_INVENTORY;
  private emergencyRequests: EmergencyRequest[] = [];
  private emergencyMatches: EmergencyMatch[] = [];
  private resourceReservations: ResourceReservation[] = [];
  private dispatches: Dispatch[] = [];
  private notifications: Notification[] = [];
  private activityLogs: ActivityLog[] = [];
  private listeners: Array<() => void> = [];
  private reservationLock: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('medconnect_db_v2') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        this.profiles = parsed.profiles || [];
        this.hospitals = parsed.hospitals || INITIAL_HOSPITALS;
        // Merge departments
        if (parsed.departments && Array.isArray(parsed.departments)) {
          const deptIds = new Set(parsed.departments.map((d: any) => d.id));
          const missingDepts = INITIAL_DEPARTMENTS.filter(d => !deptIds.has(d.id));
          this.departments = [...parsed.departments, ...missingDepts];
        } else {
          this.departments = INITIAL_DEPARTMENTS;
        }

        // Merge doctors & update availability schedules
        if (parsed.doctors && Array.isArray(parsed.doctors)) {
          const initialMap = new Map(INITIAL_DOCTORS.map(d => [d.id, d]));
          this.doctors = parsed.doctors.map((d: any) => {
            const init = initialMap.get(d.id);
            if (init) {
              return {
                ...d,
                available_days: init.available_days,
                start_time: d.start_time || init.start_time,
                end_time: init.end_time,
                consultation_fee: d.consultation_fee || init.consultation_fee,
                is_active: d.is_active !== false,
              };
            }
            return d;
          });
          const docIds = new Set(this.doctors.map(d => d.id));
          const missingDocs = INITIAL_DOCTORS.filter(d => !docIds.has(d.id));
          this.doctors.push(...missingDocs);
        } else {
          this.doctors = INITIAL_DOCTORS;
        }
        this.patients = parsed.patients || [];
        this.appointments = parsed.appointments || [];
        this.queueTokens = parsed.queueTokens || [];
        this.inventory = parsed.inventory || INITIAL_INVENTORY;
        this.emergencyRequests = parsed.emergencyRequests || [];
        this.emergencyMatches = parsed.emergencyMatches || [];
        this.resourceReservations = parsed.resourceReservations || [];
        this.dispatches = parsed.dispatches || [];
        this.notifications = parsed.notifications || [];
        this.activityLogs = parsed.activityLogs || [];
      } else {
        this.saveToStorage();
      }
    } catch {
      // Fallback
    }
  }

  public saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('medconnect_db_v2', JSON.stringify({
          profiles: this.profiles,
          hospitals: this.hospitals,
          departments: this.departments,
          doctors: this.doctors,
          patients: this.patients,
          appointments: this.appointments,
          queueTokens: this.queueTokens,
          inventory: this.inventory,
          emergencyRequests: this.emergencyRequests,
          emergencyMatches: this.emergencyMatches,
          resourceReservations: this.resourceReservations,
          dispatches: this.dispatches,
          notifications: this.notifications,
          activityLogs: this.activityLogs
        }));
      }
    } catch {
      // Storage quota safety
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // --- PROFILES & AUTH ---
  public getProfile(userId: string): Profile | undefined {
    return this.profiles.find(p => p.id === userId);
  }

  public createOrUpdateProfile(profile: Partial<Profile> & { id: string; full_name: string; role: UserRole }): Profile {
    const idx = this.profiles.findIndex(p => p.id === profile.id);
    const now = new Date().toISOString();
    let updated: Profile;
    if (idx >= 0) {
      updated = { ...this.profiles[idx], ...profile, updated_at: now };
      this.profiles[idx] = updated;
    } else {
      updated = {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        hospital_id: profile.hospital_id || 'hosp-101',
        phone: profile.phone || null,
        avatar_url: profile.avatar_url || null,
        created_at: now,
        updated_at: now
      };
      this.profiles.push(updated);
    }
    this.saveToStorage();
    return updated;
  }

  // --- HOSPITALS ---
  public getHospitals(): Hospital[] {
    return [...this.hospitals];
  }

  public createHospital(hospitalData: Omit<Hospital, 'id' | 'created_at' | 'updated_at'>): Hospital {
    const id = `hosp-${Date.now()}`;
    const now = new Date().toISOString();
    const newHospital: Hospital = {
      ...hospitalData,
      id,
      created_at: now,
      updated_at: now
    };
    this.hospitals.push(newHospital);
    this.saveToStorage();
    return newHospital;
  }

  public addOrUpdateHospital(hospital: Partial<Hospital> & { id: string; name: string }): Hospital {
    const idx = this.hospitals.findIndex(h => h.id === hospital.id);
    const now = new Date().toISOString();
    let updated: Hospital;
    if (idx >= 0) {
      updated = { ...this.hospitals[idx], ...hospital, updated_at: now };
      this.hospitals[idx] = updated;
    } else {
      updated = {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code || hospital.id,
        address: hospital.address || 'Registered Location',
        latitude: hospital.latitude ?? (hospital as any).lat ?? 28.6139,
        longitude: hospital.longitude ?? (hospital as any).lng ?? 77.2090,
        lat: hospital.lat ?? hospital.latitude ?? 28.6139,
        lng: hospital.lng ?? hospital.longitude ?? 77.2090,
        phone: hospital.phone || '+91-11-00000000',
        emergency_contact: hospital.emergency_contact || '+91-11-00000001',
        is_active: hospital.is_active !== undefined ? hospital.is_active : true,
        created_at: now,
        updated_at: now
      };
      this.hospitals.push(updated);
    }
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  // --- DOCTORS & DEPARTMENTS ---
  public getDoctors(hospitalId?: string, includeInactive: boolean = false): Doctor[] {
    return this.doctors.filter(d => {
      if (hospitalId && d.hospital_id !== hospitalId) return false;
      if (!includeInactive && !d.is_active) return false;
      return true;
    });
  }

  public getAllDoctors(hospitalId?: string): Doctor[] {
    return this.getDoctors(hospitalId, true);
  }

  public getDepartments(hospitalId?: string): Department[] {
    if (hospitalId) {
      return this.departments.filter(d => d.hospital_id === hospitalId);
    }
    return [...this.departments];
  }

  public createDepartment(hospital_id: string, name: string, description?: string): Department {
    const existing = this.departments.find(
      dep => dep.hospital_id === hospital_id && dep.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      hospital_id,
      name,
      description: description || null,
      created_at: new Date().toISOString(),
    };
    this.departments.push(newDept);
    this.saveToStorage();
    return newDept;
  }

  public createDoctor(docData: Omit<Doctor, 'id' | 'created_at' | 'updated_at'>): Doctor {
    const id = `doc-${Date.now()}`;
    const now = new Date().toISOString();
    const doctor: Doctor = {
      ...docData,
      id,
      consultation_fee: docData.consultation_fee ?? 500,
      consultation_duration_minutes: docData.consultation_duration_minutes || 15,
      available_days: docData.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: docData.start_time || '09:00',
      end_time: docData.end_time || '17:00',
      created_at: now,
      updated_at: now
    };
    this.doctors.push(doctor);
    this.saveToStorage();
    return doctor;
  }

  public updateDoctor(id: string, updates: Partial<Doctor>): Doctor {
    const idx = this.doctors.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Doctor not found');
    const updated = { ...this.doctors[idx], ...updates, updated_at: new Date().toISOString() };
    this.doctors[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  public toggleDoctorActive(id: string): Doctor {
    const idx = this.doctors.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Doctor not found');
    const updated = {
      ...this.doctors[idx],
      is_active: !this.doctors[idx].is_active,
      updated_at: new Date().toISOString()
    };
    this.doctors[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  // --- APPOINTMENTS & TOKENS ---
  private bookingLock: boolean = false;

  public getAppointments(filter?: { hospital_id?: string; patient_phone?: string; date?: string; status?: string }): Appointment[] {
    return this.appointments.filter(a => {
      if (filter?.hospital_id && a.hospital_id !== filter.hospital_id) return false;
      if (filter?.patient_phone && a.patient_phone !== filter.patient_phone) return false;
      if (filter?.date && a.appointment_date !== filter.date) return false;
      if (filter?.status && a.status !== filter.status) return false;
      return true;
    });
  }

  public getAppointmentById(id: string): Appointment | undefined {
    return this.appointments.find(a => a.id === id);
  }

  public calculateAvailableSlots(doctorId: string, dateStr: string): string[] {
    const doctor = this.doctors.find(d => d.id === doctorId);
    
    // RULE 1: Inactive doctor or missing doctor returns NO availability!
    if (!doctor || !doctor.is_active) {
      return [];
    }

    // RULE 2: Validate Working Days for Date
    const parts = dateStr.split('-').map(Number);
    let dateObj: Date;
    if (parts.length === 3) {
      dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      dateObj = new Date(dateStr);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayName = dayNames[dateObj.getDay()];

    if (
      doctor.available_days &&
      doctor.available_days.length > 0 &&
      !doctor.available_days.includes(targetDayName)
    ) {
      return [];
    }

    // RULE 3: Parse Doctor working start & end time
    const [startH, startM] = doctor.start_time.split(':').map(Number);
    const [endH, endM] = doctor.end_time.split(':').map(Number);
    const duration = doctor.consultation_duration_minutes || 15;

    // RULE 4: Query Active Booked Appointments (Booked slots disappear!)
    const existingAppointments = this.appointments.filter(
      a => a.doctor_id === doctorId && a.appointment_date === dateStr && a.status !== 'CANCELLED'
    );
    const bookedTimes = new Set(existingAppointments.map(a => normalizeTimeSlot(a.appointment_time)));

    const slots: string[] = [];
    let currMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Check if date is today to filter out past slots
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    while (currMinutes + duration <= endMinutes) {
      const hNum = Math.floor(currMinutes / 60);
      const mNum = currMinutes % 60;
      const h24 = hNum.toString().padStart(2, '0');
      const mStr = mNum.toString().padStart(2, '0');
      const timeStr24 = `${h24}:${mStr}`;

      // Also generate 12-hour formatted time (e.g. 09:00 AM)
      const period = hNum >= 12 ? 'PM' : 'AM';
      const h12Num = hNum % 12 === 0 ? 12 : hNum % 12;
      const h12Str = h12Num.toString().padStart(2, '0');
      const timeStr12 = `${h12Str}:${mStr} ${period}`;

      if (!bookedTimes.has(timeStr12) && !bookedTimes.has(normalizeTimeSlot(timeStr24))) {
        // If booking for today, only present upcoming slots
        if (!isToday || currMinutes > currentMinutes) {
          slots.push(timeStr12);
        }
      }

      currMinutes += duration;
    }
    return slots;
  }

  public async createAppointmentAsync(data: {
    hospital_id: string;
    department_id?: string;
    doctor_id: string;
    patient_name: string;
    patient_phone: string;
    appointment_date: string;
    appointment_time: string;
    notes?: string;
  }): Promise<{ appointment: Appointment; token: QueueToken }> {
    while (this.bookingLock) {
      await new Promise(r => setTimeout(r, 5));
    }
    this.bookingLock = true;
    try {
      return this.createAppointment(data);
    } finally {
      this.bookingLock = false;
    }
  }

  public createAppointment(data: {
    hospital_id: string;
    department_id?: string;
    doctor_id: string;
    patient_name: string;
    patient_phone: string;
    appointment_date: string;
    appointment_time: string;
    notes?: string;
  }): { appointment: Appointment; token: QueueToken } {
    // 1. Hospital Verification
    let hospital = this.hospitals.find(h => h.id === data.hospital_id);
    if (!hospital && (data.hospital_id === 'hosp-1' || !data.hospital_id)) {
      hospital = this.hospitals.find(h => h.id === 'hosp-101');
    }
    if (!hospital || !hospital.is_active) {
      throw new Error('Invalid or inactive hospital ID.');
    }

    // 2. Patient Booking Verification
    if (!data.patient_name || !data.patient_name.trim() || !data.patient_phone || !data.patient_phone.trim()) {
      throw new Error('Unauthorized or invalid patient booking details.');
    }

    // 3. Doctor Verification
    const doctor = this.doctors.find(d => d.id === data.doctor_id);
    if (!doctor || !doctor.is_active) {
      throw new Error('Doctor is inactive or does not belong to specified hospital.');
    }
    if (doctor.hospital_id !== hospital.id && data.hospital_id !== 'hosp-1') {
      throw new Error('Doctor is inactive or does not belong to specified hospital.');
    }

    // 4. Past Appointments Check
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (data.appointment_date < todayStr) {
      throw new Error('Cannot book appointments for past dates.');
    }

    const normalizedReqTime = normalizeTimeSlot(data.appointment_time);

    if (data.appointment_date === todayStr) {
      const match = normalizedReqTime.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/);
      if (match) {
        let [_, hStr, mStr, period] = match;
        let h24 = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (period === 'PM' && h24 !== 12) h24 += 12;
        if (period === 'AM' && h24 === 12) h24 = 0;
        const slotMinutes = h24 * 60 + m;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (slotMinutes <= currentMinutes) {
          throw new Error('Cannot book appointments for past times today.');
        }
      }
    }

    // 5. Doctor Schedule & Slot Availability Check
    const availableSlots = this.calculateAvailableSlots(data.doctor_id, data.appointment_date);
    const normalizedAvailable = availableSlots.map(normalizeTimeSlot);
    if (!normalizedAvailable.includes(normalizedReqTime)) {
      throw new Error('Selected time slot is unavailable or outside working hours.');
    }

    // 6. Double Booking Conflict Check
    const doubleBookConflict = this.appointments.find(
      a => a.doctor_id === data.doctor_id &&
           a.appointment_date === data.appointment_date &&
           normalizeTimeSlot(a.appointment_time) === normalizedReqTime &&
           a.status !== 'CANCELLED'
    );
    if (doubleBookConflict) {
      throw new Error('This time slot has already been booked. Please select another slot.');
    }

    // 7. Duplicate Booking Conflict Check (Patient Level)
    const duplicatePatientConflict = this.appointments.find(
      a => a.patient_phone === data.patient_phone &&
           a.doctor_id === data.doctor_id &&
           a.appointment_date === data.appointment_date &&
           normalizeTimeSlot(a.appointment_time) === normalizedReqTime &&
           a.status !== 'CANCELLED'
    );
    if (duplicatePatientConflict) {
      throw new Error('Patient already has an active appointment for this slot.');
    }

    const timestamp = new Date().toISOString();
    const apptId = `appt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const apptNumber = `APPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const appointment: Appointment = {
      id: apptId,
      appointment_number: apptNumber,
      hospital_id: doctor.hospital_id || data.hospital_id,
      department_id: data.department_id || doctor.department_id || null,
      doctor_id: data.doctor_id,
      patient_id: null,
      patient_name: data.patient_name,
      patient_phone: data.patient_phone,
      appointment_date: data.appointment_date,
      appointment_time: normalizedReqTime,
      status: 'BOOKED',
      notes: data.notes || null,
      created_at: timestamp,
      updated_at: timestamp
    };
    this.appointments.push(appointment);

    // Generate Queue Token
    const hospitalTokens = this.queueTokens.filter(t => t.hospital_id === data.hospital_id);
    const seq = hospitalTokens.length + 101;
    const tokenNum = `MED-${seq}`;
    const token: QueueToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hospital_id: data.hospital_id,
      appointment_id: apptId,
      doctor_id: data.doctor_id,
      token_number: tokenNum,
      sequence_number: seq,
      status: 'WAITING',
      created_at: timestamp,
      updated_at: timestamp
    };
    this.queueTokens.push(token);

    this.logActivity(data.hospital_id, null, 'APPOINTMENT_CREATED', 'appointments', apptId, {
      token: tokenNum,
      patient_name: data.patient_name
    });

    this.saveToStorage();
    return { appointment, token };
  }

  public updateAppointmentStatus(appointmentId: string, status: import('../types/database.types').AppointmentStatus): Appointment {
    const idx = this.appointments.findIndex(a => a.id === appointmentId);
    if (idx === -1) throw new Error('Appointment not found');

    const now = new Date().toISOString();
    this.appointments[idx].status = status;
    this.appointments[idx].updated_at = now;

    // Sync corresponding queue token
    const tokenIdx = this.queueTokens.findIndex(t => t.appointment_id === appointmentId);
    if (tokenIdx >= 0) {
      if (status === 'CHECKED_IN') this.queueTokens[tokenIdx].status = 'CHECKED_IN';
      if (status === 'IN_QUEUE') this.queueTokens[tokenIdx].status = 'CHECKED_IN';
      if (status === 'IN_CONSULTATION') this.queueTokens[tokenIdx].status = 'CALLED';
      if (status === 'COMPLETED') this.queueTokens[tokenIdx].status = 'COMPLETED';
      if (status === 'CANCELLED') this.queueTokens[tokenIdx].status = 'CANCELLED';
      if (status === 'NO_SHOW') this.queueTokens[tokenIdx].status = 'CANCELLED';
      this.queueTokens[tokenIdx].updated_at = now;
    }

    this.saveToStorage();
    return this.appointments[idx];
  }

  public cancelAppointment(appointmentId: string): Appointment {
    return this.updateAppointmentStatus(appointmentId, 'CANCELLED');
  }

  // --- QUEUE ENGINE ---
  public getQueueTokens(hospitalId?: string): QueueToken[] {
    if (hospitalId) {
      return this.queueTokens.filter(t => t.hospital_id === hospitalId);
    }
    return [...this.queueTokens];
  }

  public updateQueueTokenStatus(tokenId: string, status: QueueStatus): QueueToken {
    const idx = this.queueTokens.findIndex(t => t.id === tokenId);
    if (idx === -1) throw new Error('Queue token not found');

    const now = new Date().toISOString();
    const token = this.queueTokens[idx];
    token.status = status;
    token.updated_at = now;

    if (status === 'CHECKED_IN') token.checked_in_at = token.checked_in_at || now;
    if (status === 'CALLED') token.called_at = token.called_at || now;
    if (status === 'COMPLETED') token.completed_at = token.completed_at || now;

    // Sync appointment status
    const apptIdx = this.appointments.findIndex(a => a.id === token.appointment_id);
    if (apptIdx >= 0) {
      if (status === 'CHECKED_IN') this.appointments[apptIdx].status = 'CHECKED_IN';
      if (status === 'CALLED') this.appointments[apptIdx].status = 'IN_CONSULTATION';
      if (status === 'COMPLETED') this.appointments[apptIdx].status = 'COMPLETED';
      if (status === 'CANCELLED') this.appointments[apptIdx].status = 'CANCELLED';
      this.appointments[apptIdx].updated_at = now;
    }

    this.saveToStorage();
    return token;
  }

  public callNextPatient(hospitalId: string = 'hosp-101', doctorId?: string): QueueToken | null {
    const now = new Date().toISOString();

    const matchesDoctor = (t: QueueToken) => {
      if (!doctorId) return true;
      const targetDocId = t.doctor_id || this.appointments.find(a => a.id === t.appointment_id)?.doctor_id;
      return targetDocId === doctorId;
    };

    // 1. Mark currently called token as completed
    const currentCalledIdx = this.queueTokens.findIndex(t => 
      t.hospital_id === hospitalId &&
      t.status === 'CALLED' &&
      matchesDoctor(t)
    );
    if (currentCalledIdx >= 0) {
      this.queueTokens[currentCalledIdx].status = 'COMPLETED';
      this.queueTokens[currentCalledIdx].completed_at = now;
      this.queueTokens[currentCalledIdx].updated_at = now;

      const apptIdx = this.appointments.findIndex(a => a.id === this.queueTokens[currentCalledIdx].appointment_id);
      if (apptIdx >= 0) {
        this.appointments[apptIdx].status = 'COMPLETED';
        this.appointments[apptIdx].updated_at = now;
      }
    }

    // 2. Find next waiting or checked-in token
    const nextCandidates = this.queueTokens.filter(t => 
      t.hospital_id === hospitalId &&
      (t.status === 'CHECKED_IN' || t.status === 'WAITING') &&
      matchesDoctor(t)
    ).sort((a, b) => a.sequence_number - b.sequence_number);

    if (nextCandidates.length === 0) {
      this.saveToStorage();
      return null;
    }

    const nextToken = nextCandidates[0];
    const nextIdx = this.queueTokens.findIndex(t => t.id === nextToken.id);
    this.queueTokens[nextIdx].status = 'CALLED';
    this.queueTokens[nextIdx].called_at = now;
    this.queueTokens[nextIdx].updated_at = now;

    const apptIdx = this.appointments.findIndex(a => a.id === nextToken.appointment_id);
    if (apptIdx >= 0) {
      this.appointments[apptIdx].status = 'IN_CONSULTATION';
      this.appointments[apptIdx].updated_at = now;
    }

    this.saveToStorage();
    return this.queueTokens[nextIdx];
  }

  public getPatientQueueMetrics(tokenIdOrApptId: string): {
    my_token: string;
    current_token: string;
    queue_position: number;
    people_ahead: number;
    estimated_wait_minutes: number;
    status: QueueStatus;
    checked_in_at?: string | null;
  } {
    const token = this.queueTokens.find(t => t.id === tokenIdOrApptId || t.appointment_id === tokenIdOrApptId);
    if (!token) {
      return {
        my_token: 'N/A',
        current_token: 'None',
        queue_position: 0,
        people_ahead: 0,
        estimated_wait_minutes: 0,
        status: 'WAITING'
      };
    }

    const appt = this.appointments.find(a => a.id === token.appointment_id);
    const targetDocId = token.doctor_id || appt?.doctor_id;
    const doctor = this.doctors.find(d => d.id === targetDocId);
    const duration = doctor?.consultation_duration_minutes || 15;

    const matchesDoctor = (t: QueueToken) => {
      if (!targetDocId) return true;
      const docId = t.doctor_id || this.appointments.find(a => a.id === t.appointment_id)?.doctor_id;
      return docId === targetDocId;
    };

    // Current called token in room
    const currentCalled = this.queueTokens.find(t => 
      t.hospital_id === token.hospital_id && 
      t.status === 'CALLED' &&
      matchesDoctor(t)
    );

    // People ahead in active queue states
    const peopleAhead = this.queueTokens.filter(t => 
      t.hospital_id === token.hospital_id &&
      matchesDoctor(t) &&
      (t.status === 'WAITING' || t.status === 'CHECKED_IN') &&
      t.sequence_number < token.sequence_number
    ).length;

    // Queue position among active tokens
    const activeTokens = this.queueTokens.filter(t => 
      t.hospital_id === token.hospital_id &&
      matchesDoctor(t) &&
      (t.status === 'WAITING' || t.status === 'CHECKED_IN' || t.status === 'CALLED')
    ).sort((a, b) => a.sequence_number - b.sequence_number);

    const position = activeTokens.findIndex(t => t.id === token.id) + 1;

    const estWait = peopleAhead * duration;

    return {
      my_token: token.token_number,
      current_token: currentCalled ? currentCalled.token_number : 'None',
      queue_position: position > 0 ? position : 0,
      people_ahead: peopleAhead,
      estimated_wait_minutes: estWait,
      status: token.status,
      checked_in_at: token.checked_in_at
    };
  }

  // --- EMERGENCY & HAVERSINE ---
  public getEmergencyRequests(): EmergencyRequest[] {
    return [...this.emergencyRequests];
  }

  public getEmergencyMatches(): EmergencyMatch[] {
    return [...this.emergencyMatches];
  }

  public addEmergencyMatch(match: EmergencyMatch): EmergencyMatch {
    this.emergencyMatches.push(match);
    this.saveToStorage();
    return match;
  }

  public addEmergencyRequest(request: EmergencyRequest): EmergencyRequest {
    this.emergencyRequests.push(request);
    this.saveToStorage();
    return request;
  }

  public createEmergencyRequest(data: {
    requesting_hospital_id: string;
    resource_type: string;
    resource_name?: string;
    quantity: number;
    urgency: EmergencyUrgency;
    notes?: string;
  }): { request: EmergencyRequest; matches: EmergencyMatch[]; message?: string } {
    if (!data.quantity || data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    const reqHospital = this.hospitals.find(h => h.id === data.requesting_hospital_id);
    if (!reqHospital) throw new Error('Requesting hospital not found.');
    if (reqHospital.is_active === false) {
      throw new Error('Requesting hospital is inactive.');
    }

    // STRICT LOCATION BINDING & VALIDATION (NEVER USE ER STAFF GPS)
    const reqLat = reqHospital.latitude ?? (reqHospital as any).lat;
    const reqLng = reqHospital.longitude ?? (reqHospital as any).lng;

    if (
      reqLat === undefined || reqLng === undefined ||
      isNaN(reqLat) || isNaN(reqLng) ||
      Math.abs(reqLat) > 90 || Math.abs(reqLng) > 180 ||
      (reqLat === 0 && reqLng === 0)
    ) {
      throw new Error('Invalid hospital location coordinates.');
    }

    const reqId = `em-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const timeoutSec = (typeof process !== 'undefined' && process.env && process.env.EMERGENCY_TIMEOUT_SECONDS)
      ? parseInt(process.env.EMERGENCY_TIMEOUT_SECONDS, 10)
      : 180;
    const expiresAt = new Date(now.getTime() + timeoutSec * 1000).toISOString();

    const request: EmergencyRequest = {
      id: reqId,
      requesting_hospital_id: data.requesting_hospital_id,
      resource_type: data.resource_type,
      resource_name: data.resource_name || data.resource_type,
      quantity: data.quantity,
      urgency: data.urgency,
      latitude: reqLat,
      longitude: reqLng,
      status: 'PENDING',
      notes: data.notes || null,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    this.emergencyRequests.push(request);

    // Filter active target hospitals within 15 KM Haversine distance
    const matches: EmergencyMatch[] = [];
    let activeHospitalsWithinRadiusCount = 0;

    this.hospitals.forEach(targetHosp => {
      // Ignore requesting hospital and inactive hospitals
      if (targetHosp.id === data.requesting_hospital_id || targetHosp.is_active === false) return;

      const tLat = targetHosp.latitude ?? (targetHosp as any).lat;
      const tLng = targetHosp.longitude ?? (targetHosp as any).lng;

      if (
        tLat === undefined || tLng === undefined ||
        isNaN(tLat) || isNaN(tLng) ||
        Math.abs(tLat) > 90 || Math.abs(tLng) > 180 ||
        (tLat === 0 && tLng === 0)
      ) {
        return; // Skip target hospital with invalid coordinates
      }

      const dist = calculateDistanceKm(reqLat, reqLng, tLat, tLng);

      // Check 15 KM Emergency Radius
      if (dist <= 15.0) {
        activeHospitalsWithinRadiusCount++;

        // Check Inventory at target hospital
        const matchingInv = this.inventory.find(i => {
          if (i.hospital_id !== targetHosp.id) return false;
          const rTypeMatch = i.resource_type.toLowerCase() === data.resource_type.toLowerCase();
          const rNameMatch = data.resource_name
            ? (i.item_name || i.name || '').toLowerCase().includes(data.resource_name.toLowerCase()) ||
              (i.resource_type || '').toLowerCase().includes(data.resource_name.toLowerCase())
            : false;
          return (rTypeMatch || rNameMatch) && i.available_quantity >= data.quantity;
        });

        if (matchingInv) {
          const match: EmergencyMatch = {
            id: `em-match-${Date.now()}-${targetHosp.id}`,
            request_id: reqId,
            hospital_id: targetHosp.id,
            hospital_name: targetHosp.name,
            distance_km: dist,
            available_quantity: matchingInv.available_quantity,
            status: 'PENDING',
            notified_at: now.toISOString(),
            created_at: now.toISOString()
          };
          matches.push(match);
          this.emergencyMatches.push(match);
        }
      }
    });

    // RANK MATCHES USING: 1. Distance (ASC), 2. Available Quantity (DESC), 3. Availability/Status
    matches.sort((a, b) => {
      if (a.distance_km !== b.distance_km) {
        return a.distance_km - b.distance_km;
      }
      if ((b.available_quantity ?? 0) !== (a.available_quantity ?? 0)) {
        return (b.available_quantity ?? 0) - (a.available_quantity ?? 0);
      }
      return a.status.localeCompare(b.status);
    });

    let message = `Found ${matches.length} matching facilities within 15 km with available stock.`;
    if (matches.length === 0) {
      if (activeHospitalsWithinRadiusCount === 0) {
        message = 'No active hospitals found within 15 km radius.';
      } else {
        message = 'No nearby hospitals have available inventory for this resource.';
      }
    }

    this.logActivity(data.requesting_hospital_id, null, 'EMERGENCY_REQUEST_BROADCAST', 'emergency_requests', reqId, {
      resource: data.resource_type,
      resource_name: data.resource_name || data.resource_type,
      quantity: data.quantity,
      matched_count: matches.length,
      message
    });

    this.saveToStorage();
    this.notifyListeners();
    return { request, matches, message };
  }

  // --- ATOMIC EMERGENCY ACCEPTANCE & INVENTORY LOCKING ---
  public getResourceReservations(): ResourceReservation[] {
    return [...this.resourceReservations];
  }

  public async acceptEmergencyRequestAsync(
    request_id: string,
    responding_hospital_id: string
  ): Promise<{ dispatch: Dispatch; reservation: ResourceReservation; verification_code: string }> {
    while (this.reservationLock) {
      await new Promise(r => setTimeout(r, 5));
    }
    this.reservationLock = true;
    try {
      return this.acceptEmergencyRequest(request_id, responding_hospital_id);
    } finally {
      this.reservationLock = false;
    }
  }

  public acceptEmergencyRequest(
    request_id: string,
    responding_hospital_id: string
  ): { dispatch: Dispatch; reservation: ResourceReservation; verification_code: string } {
    // 1. Validate Emergency Request (Must be PENDING & unexpired)
    const request = this.emergencyRequests.find(r => r.id === request_id);
    if (!request) {
      throw new Error('Emergency request not found.');
    }
    if (request.status === 'EXPIRED' || request.status === 'ESCALATED' || (request.expires_at && new Date() >= new Date(request.expires_at))) {
      if (request.status === 'PENDING') {
        request.status = 'EXPIRED';
      }
      throw new Error('Emergency request has expired and cannot be accepted.');
    }
    if (request.status !== 'PENDING') {
      throw new Error('Emergency request is no longer active or already fulfilled.');
    }

    // 2. Validate Target Inventory at Responding Hospital
    const invIdx = this.inventory.findIndex(
      i => i.hospital_id === responding_hospital_id &&
           (i.resource_type.toLowerCase() === request.resource_type.toLowerCase() ||
            (request.resource_name && (i.item_name || i.name || '').toLowerCase().includes(request.resource_name.toLowerCase())))
    );

    if (invIdx === -1) {
      throw new Error('Inventory item not found at responding hospital.');
    }

    const item = this.inventory[invIdx];
    const available = item.total_quantity - item.reserved_quantity;

    if (available < request.quantity || item.available_quantity < request.quantity) {
      throw new Error('Insufficient available inventory to fulfill emergency reservation.');
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 3. Atomically Reserve Inventory (available = total - reserved)
    item.reserved_quantity += request.quantity;
    item.available_quantity = item.total_quantity - item.reserved_quantity;
    item.updated_at = nowIso;

    if (item.available_quantity < 0 || item.reserved_quantity > item.total_quantity) {
      // Rollback
      item.reserved_quantity -= request.quantity;
      item.available_quantity = item.total_quantity - item.reserved_quantity;
      throw new Error('Reservation failed: invalid resulting inventory levels.');
    }

    // 4. Create Resource Reservation Record
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const reservationId = `res-${now.getTime()}-${Math.random().toString(36).substring(2, 6)}`;
    const reservation: ResourceReservation = {
      id: reservationId,
      request_id: request.id,
      inventory_item_id: item.id,
      hospital_id: responding_hospital_id,
      reserved_quantity: request.quantity,
      status: 'RESERVED',
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    };
    this.resourceReservations.push(reservation);

    // 5. Update Request Status & Matches
    request.status = 'FULFILLED';
    request.updated_at = nowIso;

    this.emergencyMatches.forEach(m => {
      if (m.request_id === request_id) {
        if (m.hospital_id === responding_hospital_id) {
          m.status = 'ACCEPTED';
          m.responded_at = nowIso;
        } else if (m.status === 'PENDING') {
          m.status = 'DECLINED';
          m.responded_at = nowIso;
        }
      }
    });

    // 6. Create Verification Code & Dispatch Record
    const verificationCode = `DSP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const dispatch: Dispatch = {
      id: `disp-${now.getTime()}-${Math.random().toString(36).substring(2, 6)}`,
      request_id: request.id,
      reservation_id: reservationId,
      source_hospital_id: responding_hospital_id,
      destination_hospital_id: request.requesting_hospital_id,
      resource_type: request.resource_type,
      quantity: request.quantity,
      status: 'DISPATCH_CREATED',
      verification_code: verificationCode,
      accepted_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso
    };
    this.dispatches.push(dispatch);

    this.logActivity(responding_hospital_id, null, 'EMERGENCY_REQUEST_ACCEPTED', 'dispatches', dispatch.id, {
      code: verificationCode,
      reservation_id: reservationId,
      reserved_quantity: request.quantity
    });

    this.saveToStorage();
    this.notifyListeners();
    return { dispatch, reservation, verification_code: verificationCode };
  }

  public getDispatches(): Dispatch[] {
    return [...this.dispatches];
  }

  public getDispatchByCodeOrId(identifier: string): Dispatch | undefined {
    return this.dispatches.find(d => d.id === identifier || d.verification_code === identifier);
  }

  public updateDispatchStatus(
    dispatchId: string,
    newStatus: DispatchStatus,
    userId?: string,
    hospitalId?: string
  ): Dispatch {
    const dispatch = this.dispatches.find(d => d.id === dispatchId || d.verification_code === dispatchId);
    if (!dispatch) {
      throw new Error('Dispatch record not found.');
    }

    const currentStatus = dispatch.status;

    // Enforce valid server-side state transitions
    const validTransitions: Record<string, string[]> = {
      CREATED: ['MATCHED', 'CANCELLED'],
      MATCHED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['STOCK_RESERVED', 'CANCELLED'],
      STOCK_RESERVED: ['DISPATCH_CREATED', 'CANCELLED'],
      DISPATCH_CREATED: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
      RECEIVED: ['COMPLETED', 'CANCELLED'],
      RESERVED: ['DISPATCH_CREATED', 'IN_TRANSIT', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid state transition from ${currentStatus} to ${newStatus}.`);
    }

    const nowIso = new Date().toISOString();
    dispatch.status = newStatus;
    dispatch.updated_at = nowIso;

    if (newStatus === 'COMPLETED') {
      dispatch.completed_at = nowIso;

      // Update associated reservation status to CONSUMED and consume inventory stock
      if (dispatch.reservation_id) {
        const reservation = this.resourceReservations.find(r => r.id === dispatch.reservation_id);
        if (reservation) {
          reservation.status = 'CONSUMED';
          reservation.updated_at = nowIso;

          const invItem = this.inventory.find(i => i.id === reservation.inventory_item_id);
          if (invItem) {
            const qtyToDeduct = reservation.reserved_quantity || (reservation as any).quantity || 0;
            const currentTotal = invItem.total_quantity ?? ((invItem.available_quantity || 0) + (invItem.reserved_quantity || 0));
            const currentReserved = invItem.reserved_quantity ?? 0;
            invItem.total_quantity = Math.max(0, currentTotal - qtyToDeduct);
            invItem.reserved_quantity = Math.max(0, currentReserved - qtyToDeduct);
            invItem.available_quantity = invItem.total_quantity - invItem.reserved_quantity;
            invItem.updated_at = nowIso;
          }
        }
      }
    }

    // Create audit log entry for status change
    this.logActivity(hospitalId || dispatch.source_hospital_id, userId || null, 'DISPATCH_STATUS_UPDATE', 'dispatches', dispatch.id, {
      from_status: currentStatus,
      to_status: newStatus,
      updated_at: nowIso,
    });

    this.saveToStorage();
    this.notifyListeners();
    return dispatch;
  }

  // --- INVENTORY ---
  public getInventory(hospitalId?: string): InventoryItem[] {
    const list = hospitalId
      ? this.inventory.filter(i => i.hospital_id === hospitalId)
      : [...this.inventory];

    return list.map(item => {
      const total = item.total_quantity ?? (item.available_quantity + item.reserved_quantity);
      const reserved = item.reserved_quantity ?? 0;
      const available = total - reserved;
      return {
        ...item,
        total_quantity: total,
        reserved_quantity: reserved,
        available_quantity: available,
        item_name: item.item_name || item.name || 'Resource'
      };
    });
  }

  public addInventoryItem(data: {
    hospital_id: string;
    resource_type: string;
    item_name: string;
    total_quantity: number;
    unit: string;
    subtype?: string | null;
    reserved_quantity?: number;
  }): InventoryItem {
    if (data.total_quantity < 0) {
      throw new Error('Total quantity cannot be negative.');
    }
    const reserved = data.reserved_quantity ?? 0;
    if (reserved < 0) {
      throw new Error('Reserved quantity cannot be negative.');
    }
    if (reserved > data.total_quantity) {
      throw new Error('Reserved quantity cannot exceed total quantity.');
    }
    const available = data.total_quantity - reserved;
    if (available < 0) {
      throw new Error('Available inventory cannot be negative.');
    }

    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hospital_id: data.hospital_id,
      resource_type: data.resource_type,
      item_name: data.item_name,
      name: data.item_name,
      subtype: data.subtype || null,
      total_quantity: data.total_quantity,
      reserved_quantity: reserved,
      available_quantity: available,
      unit: data.unit || 'units',
      created_at: now,
      updated_at: now
    };

    this.inventory.push(newItem);
    this.saveToStorage();
    this.notifyListeners();
    return newItem;
  }

  public updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');

    const current = this.inventory[idx];
    const total = updates.total_quantity !== undefined ? updates.total_quantity : current.total_quantity;
    const reserved = updates.reserved_quantity !== undefined ? updates.reserved_quantity : current.reserved_quantity;

    if (total < 0) {
      throw new Error('Total quantity cannot be negative.');
    }
    if (reserved < 0) {
      throw new Error('Reserved quantity cannot be negative.');
    }
    if (reserved > total) {
      throw new Error('Reserved quantity cannot exceed total quantity.');
    }
    const available = total - reserved;
    if (available < 0) {
      throw new Error('Available quantity cannot be negative.');
    }

    const updated: InventoryItem = {
      ...current,
      ...updates,
      item_name: updates.item_name || updates.name || current.item_name || current.name || 'Resource',
      name: updates.name || updates.item_name || current.name || current.item_name || 'Resource',
      total_quantity: total,
      reserved_quantity: reserved,
      available_quantity: available,
      updated_at: new Date().toISOString()
    };

    this.inventory[idx] = updated;
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  public increaseStock(id: string, amount: number): InventoryItem {
    if (amount <= 0) {
      throw new Error('Increase amount must be greater than zero.');
    }
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');

    const item = this.inventory[idx];
    const newTotal = item.total_quantity + amount;
    return this.updateInventoryItem(id, { total_quantity: newTotal });
  }

  public decreaseStock(id: string, amount: number): InventoryItem {
    if (amount <= 0) {
      throw new Error('Decrease amount must be greater than zero.');
    }
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');

    const item = this.inventory[idx];
    const newTotal = item.total_quantity - amount;

    if (newTotal < 0) {
      throw new Error('Inventory cannot be negative.');
    }
    if (newTotal < item.reserved_quantity) {
      throw new Error('Insufficient inventory: total stock cannot be less than reserved quantity.');
    }
    if (amount > item.available_quantity) {
      throw new Error('Insufficient available inventory.');
    }

    return this.updateInventoryItem(id, { total_quantity: newTotal });
  }

  public updateInventoryQuantity(id: string, available: number): InventoryItem {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Inventory item not found');
    const item = this.inventory[idx];
    if (available < 0) throw new Error('Available quantity cannot be negative.');
    const newTotal = available + item.reserved_quantity;
    return this.updateInventoryItem(id, { total_quantity: newTotal });
  }

  // --- ACTIVITY LOGS & NOTIFICATIONS ---
  public logActivity(hospital_id: string | null, user_id: string | null, action: string, entity_type: string, entity_id?: string, details?: Record<string, unknown>) {
    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hospital_id,
      user_id,
      action,
      entity_type,
      entity_id: entity_id || null,
      details: details || null,
      created_at: new Date().toISOString()
    };
    this.activityLogs.unshift(log);
  }

  public getActivityLogs(hospitalId?: string): ActivityLog[] {
    if (hospitalId) {
      return this.activityLogs.filter(l => l.hospital_id === hospitalId || !l.hospital_id);
    }
    return [...this.activityLogs];
  }

  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public createNotification(data: {
    hospital_id?: string | null;
    user_id?: string | null;
    title: string;
    message: string;
    type: string;
    link?: string | null;
  }): Notification {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hospital_id: data.hospital_id || null,
      user_id: data.user_id || null,
      title: data.title,
      message: data.message,
      type: data.type,
      is_read: false,
      link: data.link || null,
      created_at: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    this.saveToStorage();
    this.notifyListeners();
    return notif;
  }
}

export const dbEngine = new LocalRelationalEngine();
