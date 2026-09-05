export type UserRole = 'patient' | 'receptionist' | 'er_staff' | 'hospital_admin';
export type AppointmentStatus = 'BOOKED' | 'SCHEDULED' | 'CHECKED_IN' | 'IN_QUEUE' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type QueueStatus = 'WAITING' | 'CHECKED_IN' | 'CALLED' | 'COMPLETED' | 'CANCELLED';
export type EmergencyUrgency = 'CRITICAL' | 'HIGH' | 'MODERATE';
export type EmergencyStatus = 'PENDING' | 'FULFILLED' | 'ESCALATED' | 'EXPIRED' | 'CANCELLED';
export type MatchStatus = 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type DispatchStatus =
  | 'CREATED'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'STOCK_RESERVED'
  | 'DISPATCH_CREATED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESERVED'
  | 'DELIVERED';

export type ReservationStatus = 'RESERVED' | 'DISPATCHED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED' | 'CONSUMED';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  hospital_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  code?: string;
  address: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  phone: string;
  emergency_contact: string;
  is_active: boolean;
  city?: string;
  state?: string;
  pincode?: string;
  created_at: string;
  updated_at: string;
}

export interface HospitalMember {
  id: string;
  hospital_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Doctor {
  id: string;
  hospital_id: string;
  department_id?: string | null;
  user_id?: string | null;
  name: string;
  specialization: string;
  consultation_fee?: number;
  consultation_duration_minutes: number;
  available_days: string[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string; // e.g. "09:00"
  end_time: string;   // e.g. "17:00"
  slot_duration_minutes: number;
  max_patients?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Patient {
  id: string;
  user_id?: string | null;
  full_name: string;
  age: number;
  gender: string;
  blood_group?: string | null;
  phone: string;
  emergency_contact?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  appointment_number?: string;
  hospital_id: string;
  department_id?: string | null;
  doctor_id: string;
  patient_id?: string | null;
  patient_name: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueToken {
  id: string;
  hospital_id: string;
  appointment_id: string;
  department_id?: string | null;
  doctor_id?: string | null;
  token_number: string;
  sequence_number: number;
  status: QueueStatus;
  checked_in_at?: string | null;
  called_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type InventoryResourceType = 'Oxygen' | 'Blood' | 'ICU Bed' | 'Ventilator' | 'Medicine' | 'Other' | string;

export interface InventoryItem {
  id: string;
  hospital_id: string;
  resource_type: InventoryResourceType;
  item_name: string;
  name?: string;
  subtype?: string | null;
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyRequest {
  id: string;
  request_number?: string;
  requesting_hospital_id: string;
  resource_type: string;
  resource_name?: string;
  quantity: number;
  urgency: EmergencyUrgency;
  latitude: number;
  longitude: number;
  status: EmergencyStatus;
  notes?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyMatch {
  id: string;
  request_id: string;
  hospital_id: string;
  hospital_name?: string;
  distance_km: number;
  available_quantity?: number;
  status: MatchStatus;
  notified_at: string;
  responded_at?: string | null;
  created_at: string;
}

export interface ResourceReservation {
  id: string;
  request_id: string;
  inventory_item_id: string;
  hospital_id: string;
  reserved_quantity: number;
  status: ReservationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Dispatch {
  id: string;
  request_id: string;
  emergency_request_id?: string;
  reservation_id?: string | null;
  source_hospital_id: string;
  supplying_hospital_id?: string;
  destination_hospital_id: string;
  requesting_hospital_id?: string;
  resource_type: string;
  item_name?: string;
  quantity: number;
  status: DispatchStatus;
  verification_code: string;
  accepted_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  hospital_id?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  hospital_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}
