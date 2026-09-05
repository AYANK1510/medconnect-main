export type UserRole = 'patient' | 'reception' | 'er_staff' | 'admin';

export type ActivePage =
  | 'landing'
  | 'patient'
  | 'reception'
  | 'er_command'
  | 'ai_receptionist'
  | 'live_queue'
  | 'emergency_dispatch'
  | 'hospital_network'
  | 'doctors'
  | 'inventory'
  | 'automation'
  | 'analytics'
  | 'activity'
  | 'tech_stack'
  | 'about'
  | 'settings';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type ResourceType = 'blood' | 'oxygen' | 'icu_bed';
export type UrgencyLevel = 'critical' | 'high' | 'normal';

export interface Hospital {
  id: string;
  name: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  phone: string;
  distanceKm?: number;
  icuBedsAvailable: number;
  icuBedsTotal: number;
  oxygenUnitsAvailable: number;
  oxygenUnitsTotal: number;
  bloodInventory: Record<BloodGroup, number>;
  status: 'operational' | 'busy' | 'critical_load';
}

export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  department: string;
  specialization: string;
  availableSlots: string[];
  avatar: string;
}

export interface QueueToken {
  id: string;
  token: string; // e.g. #MED-4029
  patientName: string;
  patientPhone: string;
  department: string;
  doctorName: string;
  position: number;
  status: 'serving' | 'waiting' | 'completed' | 'cancelled';
  estimatedWaitMinutes: number;
  checkedInAt: string;
}

export interface Appointment {
  id: string;
  token: string; // e.g. #MED-4029
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  department: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled';
  queuePosition: number;
  estimatedWaitMinutes: number;
  source: 'web_ui' | 'sarvam_voice' | 'whatsapp' | 'telegram';
  createdAt: string;
}

export interface EmergencyRequest {
  id: string;
  reqNumber: string; // e.g. #REQ-1042
  requestingHospitalId: string;
  requestingHospitalName: string;
  type: ResourceType;
  bloodGroup?: BloodGroup;
  quantity: number;
  urgency: UrgencyLevel;
  requestingLat: number;
  requestingLng: number;
  status: 'created' | 'calculating' | 'broadcasted' | 'accepted' | 'esc_twilio' | 'fulfilled' | 'cancelled';
  acceptedByHospitalId?: string;
  acceptedByHospitalName?: string;
  distanceToAcceptedKm?: number;
  createdAt: string;
  timerSecondsRemaining: number;
  qrPassCode?: string;
  matchedHospitalsCount?: number;
}

export interface DispatchPass {
  id: string;
  requestId: string;
  reqNumber: string;
  sendingHospitalName: string;
  receivingHospitalName: string;
  resourceType: ResourceType;
  quantity: number;
  bloodGroup?: BloodGroup;
  etaMinutes: number;
  qrCodeData: string;
  timestamp: string;
  status: 'dispatched' | 'in_transit' | 'delivered';
}

export interface InventoryItem {
  id: string;
  hospitalId: string;
  resourceType: ResourceType;
  subtype: string; // e.g. "O-", "O+", "Cylinders 45L", "ICU Beds"
  total: number;
  available: number;
  reserved: number;
  lockedForRequestId?: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: 'trigger' | 'process' | 'ai' | 'database' | 'communication' | 'escalation';
  service: string;
  description: string;
  status: 'idle' | 'active' | 'success' | 'failed';
}

export interface N8nWorkflow {
  id: string;
  title: string;
  category: 'opd_receptionist' | 'emergency_dispatch';
  description: string;
  nodes: N8nNode[];
  lastTriggered?: string;
  totalExecutions: number;
  successRate: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'appointment' | 'emergency' | 'inventory' | 'system' | 'ai';
  severity: 'info' | 'success' | 'warning' | 'emergency';
}

export interface SystemServiceHealth {
  n8n: boolean;
  supabase: boolean;
  sarvamAi: boolean;
  openAi: boolean;
  telegram: boolean;
  twilio: boolean;
}
