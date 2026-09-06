import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDoctors, fetchDepartments, calculateAvailableSlots, createAppointment, fetchAppointments, cancelAppointment } from '../services/appointmentService';
import { processVoiceIntake, type StructuredIntent } from '../services/voiceAiService';
import { startListening, type SpeechRecognitionController } from '../services/speechRecognitionService';
import type { Doctor, Department, Appointment, QueueToken } from '../types/database.types';
import { dbEngine } from '../lib/dbEngine';
import {
  Clock,
  Stethoscope,
  Building2,
  ListOrdered,
  Mic,
  Sparkles,
  StopCircle,
  RefreshCw,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  Search,
  Plus,
  ArrowRight,
  ChevronRight,
  Download,
  Heart,
  MapPin,
  Check,
  X,
  Copy,
  Printer,
  Upload,
  Eye,
  CheckCircle2,
  AlertCircle,
  Activity,
  FlaskConical,
  Lock,
  LogIn,
  HelpCircle,
  AlertTriangle,
  FileCheck,
  Edit3,
  Sliders,
  ClipboardList,
  Scale,
  Compass
} from 'lucide-react';
import {
  type PatientProfile,
  DEMO_PATIENTS,
  LAB_PANEL_PRESETS,
  type ClinicalReportAnalysis,
  analyzeLabReport,
  generateConsolidatedHealthReport,
  type PatientSelfReportInput,
  type GeneratedSelfHealthReport,
  evaluatePatientSelfDetails
} from '../services/healthReportService';

type PatientTab = 'dashboard' | 'book' | 'my_appointments' | 'live_queue' | 'medical_records' | 'profile';
export type MedicalCategoryTab = 'all' | 'reports' | 'prescriptions' | 'notes' | 'radiology' | 'discharge';

export interface MedicalRecordItem {
  id: string;
  title: string;
  date: string;
  category: 'Test Report' | 'Radiology' | 'Prescription' | 'Doctor Note' | 'Discharge';
  hospital: string;
  doctor: string;
  doctorSpecialty?: string;
  status?: string;
  summary?: string;
  details?: string[];
  medications?: { name: string; dosage: string; frequency: string; duration: string }[];
  labResults?: { test: string; result: string; unit: string; normalRange: string; status: 'NORMAL' | 'ELEVATED' | 'LOW' }[];
  fileSize?: string;
}

export const INITIAL_MEDICAL_RECORDS: MedicalRecordItem[] = [
  {
    id: 'REC-101',
    title: 'Complete Blood Count (CBC) & Lipid Profile',
    date: '2026-08-28',
    category: 'Test Report',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Internal Medicine & Pathology',
    status: 'VERIFIED',
    summary: 'Annual hematology panel showing optimal hemoglobin, normal leukocyte count, and slightly elevated LDL cholesterol.',
    labResults: [
      { test: 'Hemoglobin (Hb)', result: '14.8', unit: 'g/dL', normalRange: '13.5 - 17.5', status: 'NORMAL' },
      { test: 'Total Leukocyte Count (WBC)', result: '6,400', unit: '/mcL', normalRange: '4,500 - 11,000', status: 'NORMAL' },
      { test: 'Platelet Count', result: '245,000', unit: '/mcL', normalRange: '150,000 - 450,000', status: 'NORMAL' },
      { test: 'Total Cholesterol', result: '215', unit: 'mg/dL', normalRange: '< 200', status: 'ELEVATED' },
      { test: 'HDL (Good Cholesterol)', result: '52', unit: 'mg/dL', normalRange: '> 40', status: 'NORMAL' },
      { test: 'LDL (Bad Cholesterol)', result: '138', unit: 'mg/dL', normalRange: '< 100', status: 'ELEVATED' },
      { test: 'Serum Triglycerides', result: '142', unit: 'mg/dL', normalRange: '< 150', status: 'NORMAL' },
    ],
    fileSize: '1.4 MB PDF'
  },
  {
    id: 'REC-102',
    title: 'Chest X-Ray Digital Clearance',
    date: '2026-08-15',
    category: 'Radiology',
    hospital: 'Apex Heart Institute',
    doctor: 'Dr. Priya Nair',
    doctorSpecialty: 'Consultant Radiologist',
    status: 'VERIFIED',
    summary: 'PA & Lateral views of chest. Lung fields clear bilaterally without active focal consolidation, pneumothorax, or pleural effusion. Normal cardiothoracic ratio.',
    details: [
      'Projection: Posteroanterior (PA) & Lateral view',
      'Bony Thorax: Rib cage intact without fractures or lesions',
      'Mediastinum: Normal contour, no widening observed',
      'Heart: Transverse cardiac diameter normal (CTR < 0.50)',
      'Lungs: Bronchovascular markings within normal limits',
      'Impression: Normal cardiopulmonary study. Medically cleared.'
    ],
    fileSize: '3.2 MB DICOM'
  },
  {
    id: 'REC-103',
    title: 'Post-Op Cardiology Prescription',
    date: '2026-08-10',
    category: 'Prescription',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Chief Cardiologist',
    status: 'ACTIVE RX',
    summary: 'Cardiac maintenance regimen following coronary assessment. Daily monitoring of BP & pulse recommended.',
    medications: [
      { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once Daily (Night)', duration: '90 Days' },
      { name: 'Metoprolol Succinate', dosage: '25 mg', frequency: 'Once Daily (Morning)', duration: '90 Days' },
      { name: 'Ecosprin (Aspirin)', dosage: '75 mg', frequency: 'Once Daily (Post Lunch)', duration: '180 Days' },
      { name: 'Pantoprazole', dosage: '40 mg', frequency: 'Once Daily (Empty Stomach)', duration: '30 Days' },
    ],
    fileSize: '840 KB PDF'
  },
  {
    id: 'REC-104',
    title: 'Annual Health Checkup Doctor Notes',
    date: '2026-07-02',
    category: 'Doctor Note',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Ananya Roy',
    doctorSpecialty: 'Senior Consultant Physician',
    status: 'VERIFIED',
    summary: 'Comprehensive annual preventative evaluation. Patient reports good energy levels, regular sleep, and occasional work-related stress.',
    details: [
      'Blood Pressure: 118/76 mmHg | Pulse: 72 bpm | SpO2: 99% on room air',
      'BMI: 23.4 kg/m² (Healthy weight range)',
      'Cardiovascular: S1/S2 heard, regular rate and rhythm, no murmurs',
      'Respiratory: Vesicular breath sounds heard over all lung zones',
      'Plan: Advised 30 mins aerobic walking 5x/week, low sodium diet',
      'Next Review: 6 months or SOS if chest tightness occurs'
    ],
    fileSize: '650 KB PDF'
  },
  {
    id: 'REC-105',
    title: 'Comprehensive Metabolic Panel (CMP-14)',
    date: '2026-06-18',
    category: 'Test Report',
    hospital: 'CityCare Trauma Center',
    doctor: 'Dr. Vikram Mehta',
    doctorSpecialty: 'Clinical Biochemist',
    status: 'VERIFIED',
    summary: 'Electrolytes, liver enzymes, and renal clearance within standard physiologic ranges.',
    labResults: [
      { test: 'Fasting Blood Glucose', result: '94', unit: 'mg/dL', normalRange: '70 - 99', status: 'NORMAL' },
      { test: 'Blood Urea Nitrogen (BUN)', result: '14', unit: 'mg/dL', normalRange: '7 - 20', status: 'NORMAL' },
      { test: 'Serum Creatinine', result: '0.9', unit: 'mg/dL', normalRange: '0.6 - 1.2', status: 'NORMAL' },
      { test: 'Serum Sodium (Na+)', result: '139', unit: 'mEq/L', normalRange: '135 - 145', status: 'NORMAL' },
      { test: 'Serum Potassium (K+)', result: '4.2', unit: 'mEq/L', normalRange: '3.5 - 5.0', status: 'NORMAL' },
      { test: 'Serum Calcium', result: '9.6', unit: 'mg/dL', normalRange: '8.5 - 10.5', status: 'NORMAL' },
    ],
    fileSize: '1.2 MB PDF'
  },
  {
    id: 'REC-106',
    title: 'Thyroid Function Profile (TSH, Free T3, Free T4)',
    date: '2026-05-22',
    category: 'Test Report',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Sneha Patel',
    doctorSpecialty: 'Endocrinology',
    status: 'VERIFIED',
    summary: 'Euthyroid state confirmed. TSH, Free T3, and Free T4 are strictly within baseline biological reference intervals.',
    labResults: [
      { test: 'Ultra-sensitive TSH', result: '2.14', unit: 'mIU/L', normalRange: '0.45 - 4.50', status: 'NORMAL' },
      { test: 'Free Triiodothyronine (FT3)', result: '3.1', unit: 'pg/mL', normalRange: '2.0 - 4.4', status: 'NORMAL' },
      { test: 'Free Thyroxine (FT4)', result: '1.28', unit: 'ng/dL', normalRange: '0.82 - 1.77', status: 'NORMAL' },
    ],
    fileSize: '950 KB PDF'
  },
  {
    id: 'REC-107',
    title: 'Chronic Hypertension Maintenance Rx',
    date: '2026-05-10',
    category: 'Prescription',
    hospital: 'Apex Heart Institute',
    doctor: 'Dr. Priya Nair',
    doctorSpecialty: 'Cardiology',
    status: 'ACTIVE RX',
    summary: 'Dosage adjustment for optimal blood pressure management. Target resting systolic BP < 125 mmHg.',
    medications: [
      { name: 'Telmisartan', dosage: '40 mg', frequency: 'Once Daily (Morning)', duration: '90 Days' },
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once Daily (Morning)', duration: '90 Days' },
    ],
    fileSize: '720 KB PDF'
  },
  {
    id: 'REC-108',
    title: 'Pre-Operative Anesthesia Assessment Summary',
    date: '2026-04-14',
    category: 'Doctor Note',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Anesthesiology & Critical Care',
    status: 'VERIFIED',
    summary: 'Mallampati Class I airway, ASA Grade II risk status. Hemodynamically stable for minor procedures under local/monitored anesthesia.',
    details: [
      'ASA Physical Status: ASA II (Controlled mild systemic disease)',
      'Airway Evaluation: Mallampati Class I, full neck range of motion',
      'Dentition: Natural intact, no loose teeth or bridgework',
      'NPO Guidelines: Re-emphasized 8h solid food, 2h clear fluids rule',
      'Clearance: Anesthesiology fit certificate issued.'
    ],
    fileSize: '890 KB PDF'
  },
  {
    id: 'REC-109',
    title: 'HbA1c Glycated Hemoglobin Diabetes Monitor',
    date: '2026-03-30',
    category: 'Test Report',
    hospital: 'St. Jude Memorial Hospital',
    doctor: 'Dr. Rohan Verma',
    doctorSpecialty: 'Diabetology',
    status: 'VERIFIED',
    summary: 'HbA1c of 5.6% signifies non-diabetic range with excellent glycemic regulation across previous 90-day window.',
    labResults: [
      { test: 'HbA1c (Glycated Hemoglobin)', result: '5.6', unit: '%', normalRange: '< 5.7 (Non-diabetic)', status: 'NORMAL' },
      { test: 'Estimated Average Glucose (eAG)', result: '114', unit: 'mg/dL', normalRange: '< 117', status: 'NORMAL' },
    ],
    fileSize: '1.1 MB PDF'
  },
  {
    id: 'REC-110',
    title: 'Anti-Infective Course Rx (Amoxicillin-Clavulanate)',
    date: '2026-03-12',
    category: 'Prescription',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Ananya Roy',
    doctorSpecialty: 'Internal Medicine',
    status: 'COMPLETED RX',
    summary: '5-day antimicrobial protocol for acute seasonal bronchitis and sinus congestion. Course completed with full symptom resolution.',
    medications: [
      { name: 'Augmentin 625 (Amox-Clav)', dosage: '625 mg', frequency: 'Twice Daily (Post Meals)', duration: '5 Days' },
      { name: 'Levocetirizine', dosage: '5 mg', frequency: 'Once Daily (Bedtime)', duration: '7 Days' },
      { name: 'Saline Nasal Spray', dosage: '2 sprays', frequency: 'Thrice Daily', duration: '10 Days' },
    ],
    fileSize: '510 KB PDF'
  },
  {
    id: 'REC-111',
    title: 'Renal Function & Electrolytes Serum Panel',
    date: '2026-02-25',
    category: 'Test Report',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Nephrology & Medicine',
    status: 'VERIFIED',
    summary: 'Glomerular filtration rate eGFR > 95 mL/min/1.73m² demonstrates stage 1 healthy kidney function.',
    labResults: [
      { test: 'Serum Creatinine', result: '0.88', unit: 'mg/dL', normalRange: '0.70 - 1.30', status: 'NORMAL' },
      { test: 'Estimated GFR (CKD-EPI)', result: '98', unit: 'mL/min/1.73m²', normalRange: '> 90', status: 'NORMAL' },
      { test: 'Blood Urea Nitrogen', result: '12', unit: 'mg/dL', normalRange: '6 - 24', status: 'NORMAL' },
      { test: 'Serum Uric Acid', result: '5.2', unit: 'mg/dL', normalRange: '3.5 - 7.2', status: 'NORMAL' },
    ],
    fileSize: '1.3 MB PDF'
  },
  {
    id: 'REC-112',
    title: 'Orthopedic Pain Relief & Anti-Inflammatory Rx',
    date: '2026-02-04',
    category: 'Prescription',
    hospital: 'CityCare Trauma Center',
    doctor: 'Dr. Vikram Mehta',
    doctorSpecialty: 'Orthopedics',
    status: 'COMPLETED RX',
    summary: 'Conservative pharmacological treatment for right ankle ligament strain following physical activity.',
    medications: [
      { name: 'Aceclofenac + Paracetamol', dosage: '100/325 mg', frequency: 'Twice Daily (SOS pain)', duration: '5 Days' },
      { name: 'Thiocolchicoside (Muscle Relaxant)', dosage: '4 mg', frequency: 'Twice Daily', duration: '5 Days' },
      { name: 'Topical Diclofenac Gel', dosage: '1 Application', frequency: 'Thrice Daily gently', duration: '7 Days' },
    ],
    fileSize: '620 KB PDF'
  },
  {
    id: 'REC-113',
    title: 'Liver Function Test (LFT Profile)',
    date: '2026-01-19',
    category: 'Test Report',
    hospital: 'St. Jude Memorial Hospital',
    doctor: 'Dr. Rohan Verma',
    doctorSpecialty: 'Gastroenterology & Hepatology',
    status: 'VERIFIED',
    summary: 'Bilirubin fractions, SGOT/AST, SGPT/ALT, Alkaline Phosphatase, and Total Protein are within physiological thresholds.',
    labResults: [
      { test: 'Total Bilirubin', result: '0.8', unit: 'mg/dL', normalRange: '0.2 - 1.2', status: 'NORMAL' },
      { test: 'Direct (Conjugated) Bilirubin', result: '0.2', unit: 'mg/dL', normalRange: '< 0.3', status: 'NORMAL' },
      { test: 'SGOT / AST', result: '24', unit: 'U/L', normalRange: '10 - 40', status: 'NORMAL' },
      { test: 'SGPT / ALT', result: '28', unit: 'U/L', normalRange: '7 - 56', status: 'NORMAL' },
      { test: 'Alkaline Phosphatase (ALP)', result: '72', unit: 'U/L', normalRange: '44 - 147', status: 'NORMAL' },
      { test: 'Serum Albumin', result: '4.4', unit: 'g/dL', normalRange: '3.5 - 5.5', status: 'NORMAL' },
    ],
    fileSize: '1.5 MB PDF'
  },
  {
    id: 'REC-114',
    title: 'Cardiology Post-Stent Discharge Summary',
    date: '2025-12-28',
    category: 'Discharge',
    hospital: 'Metro City General Hospital',
    doctor: 'Dr. Rajesh Sharma',
    doctorSpecialty: 'Chief Interventional Cardiologist',
    status: 'DISCHARGED',
    summary: 'Elective coronary angiography with drug-eluting stent (DES) to proximal LAD. Uneventful 48-hour post-procedure observation. Stable vitals on ambulation.',
    details: [
      'Admission Date: 2025-12-26 | Discharge Date: 2025-12-28',
      'Procedure: Successful PCI with 1x Promus Premier DES (3.0 x 18 mm) to LAD',
      'Hemostasis: Angio-Seal vascular closure device deployed in right femoral artery',
      'Echo LVEF: 55%, normal LV systolic performance, no pericardial effusion',
      'Discharge Vitals: BP 120/78 mmHg, HR 68 bpm, regular rhythm',
      'Emergency Signs: Seek immediate ER care if persistent angina or groin swelling occurs.'
    ],
    fileSize: '4.8 MB PDF'
  }
];

export interface PatientPortalPageProps {
  subTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const PatientPortalPage: React.FC<PatientPortalPageProps> = ({
  subTab,
  onSubTabChange,
}) => {
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<PatientTab>('dashboard');
  
  // Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>([]);

  // Booking Stepper State (Phase 5)
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedHospital, setSelectedHospital] = useState('Metro City General Hospital');
  const [hospitalDistanceFilter, setHospitalDistanceFilter] = useState<'all' | '5km' | '10km' | '15km'>('all');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [patientManualLocation, setPatientManualLocation] = useState<string>('Rohini, New Delhi');
  const [isEditingPatientLocation, setIsEditingPatientLocation] = useState<boolean>(false);

  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientName, setPatientName] = useState<string>(profile?.full_name || 'Aarav Malhotra');
  const [patientPhone, setPatientPhone] = useState<string>('+91-9876543210');
  const [notes, setNotes] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{ appointment: Appointment; token: QueueToken } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Appointment Details Modal State
  const [selectedApptForDetails, setSelectedApptForDetails] = useState<Appointment | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState(false);

  // Appointments Filter Tab (Phase 6)
  const [appointmentFilterTab, setAppointmentFilterTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  // Medical Records Tab & Repository State
  const [medicalRecordTab, setMedicalRecordTab] = useState<MedicalCategoryTab>('all');

  // Synchronize incoming subTab from PatientShell
  useEffect(() => {
    if (!subTab) return;
    if (subTab === 'overview' || subTab === 'dashboard') {
      setActiveTab('dashboard');
    } else if (subTab === 'book') {
      setActiveTab('book');
    } else if (subTab === 'queue' || subTab === 'live_queue') {
      setActiveTab('live_queue');
    } else if (subTab === 'prescriptions') {
      setActiveTab('medical_records');
      setMedicalRecordTab('prescriptions');
    } else if (subTab === 'history' || subTab === 'records' || subTab === 'medical_records') {
      setActiveTab('medical_records');
      setMedicalRecordTab('all');
    }
  }, [subTab]);
  const [recordSearch, setRecordSearch] = useState('');
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecordItem[]>(INITIAL_MEDICAL_RECORDS);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<MedicalRecordItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Patient Profile & Login State
  const [currentPatient, setCurrentPatient] = useState<PatientProfile>(() => {
    const saved = localStorage.getItem('medconnect_active_patient');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEMO_PATIENTS[0];
  });
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Consolidated Health Report Modal & Self-Assessment State
  const [isHealthReportModalOpen, setIsHealthReportModalOpen] = useState(false);
  const [healthReportViewMode, setHealthReportViewMode] = useState<'report' | 'fill_details'>('report');
  const [selfForm, setSelfForm] = useState<PatientSelfReportInput>(() => ({
    fullName: 'Ayank',
    age: 35,
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '+91-98765-00000',
    email: 'ayank@medconnect.org',
    address: 'Metro City Healthcare District',
    emergencyContactName: 'Family Contact',
    emergencyContactPhone: '+91-98765-11111',
    heightCm: 174,
    weightKg: 72,
    systolicBp: 122,
    diastolicBp: 78,
    restingHeartRate: 72,
    bloodSugarFasting: 96,
    oxygenSaturation: 98,
    cholesterolTotal: 185,
    symptoms: [],
    chronicConditions: [],
    allergies: ['No Known Drug Allergies (NKDA)'],
    currentMedications: ['Multivitamins'],
    smokingStatus: 'Never',
    alcoholIntake: 'None',
    physicalActivity: 'Moderate (3-5 days/wk)',
    sleepHours: 7.5,
    dietPreference: 'Vegetarian',
    patientNotes: ''
  }));
  const [generatedSelfReport, setGeneratedSelfReport] = useState<GeneratedSelfHealthReport | null>(null);
  const [isGeneratingSelfReport, setIsGeneratingSelfReport] = useState(false);

  // Manual Lab Report & Clinical AI Results State
  const [isManualReportModalOpen, setIsManualReportModalOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string>('cbc');
  const [manualBiomarkerInputs, setManualBiomarkerInputs] = useState<{ [id: string]: string }>({
    hb: '14.5',
    wbc: '6800',
    plt: '250000',
    rbc: '5.1',
    pcv: '42.5'
  });
  const [manualReportHospital, setManualReportHospital] = useState('Metro City General Hospital');
  const [manualReportDoctor, setManualReportDoctor] = useState('Dr. Rajesh Sharma');
  const [manualReportDate, setManualReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualClinicalAnalysis, setManualClinicalAnalysis] = useState<ClinicalReportAnalysis | null>(null);
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);

  // Upload Record Modal Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<MedicalRecordItem['category']>('Test Report');
  const [uploadHospital, setUploadHospital] = useState('Metro City General Hospital');
  const [uploadDoctor, setUploadDoctor] = useState('Dr. Rajesh Sharma');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Profile Edit State (Phase 9)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Voice AI Modal State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceIntent, setVoiceIntent] = useState<StructuredIntent | null>(null);

  const loadData = async () => {
    const docs = await fetchDoctors('hosp-101');
    const depts = await fetchDepartments('hosp-101');
    setDoctors(docs);
    setDepartments(depts);
    if (depts[0]) setSelectedDept(depts[0].id);
    if (docs[0]) setSelectedDoctorId(docs[0].id);

    const appts = await fetchAppointments({ hospital_id: 'hosp-101' });
    setMyAppointments(appts);
    setQueueTokens(dbEngine.getQueueTokens('hosp-101'));
  };

  useEffect(() => {
    loadData();
    const unsub = dbEngine.subscribe(() => loadData());
    return () => unsub();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    if (selectedDoctorId && selectedDate) {
      calculateAvailableSlots(selectedDoctorId, selectedDate).then(async (slots) => {
        if (isCancelled) return;
        if (slots.length > 0) {
          setAvailableSlots(slots);
          setSelectedSlot(prev => (!prev || !slots.includes(prev) ? slots[0] : prev));
        } else {
          // If 0 slots for selected date (e.g. today after clinic hours or off-day), check upcoming days
          let nextWorkingDate = '';
          let nextSlots: string[] = [];
          for (let offset = 1; offset <= 14; offset++) {
            const nextD = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
            const s = await calculateAvailableSlots(selectedDoctorId, nextD);
            if (s.length > 0) {
              nextWorkingDate = nextD;
              nextSlots = s;
              break;
            }
          }
          if (isCancelled) return;
          if (nextWorkingDate && nextSlots.length > 0) {
            setSelectedDate(nextWorkingDate);
            setAvailableSlots(nextSlots);
            setSelectedSlot(nextSlots[0]);
          } else {
            setAvailableSlots([]);
            setSelectedSlot('');
          }
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedDoctorId, selectedDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDate || !selectedSlot) {
      setBookingError('Please select a doctor, date, and an available time slot.');
      return;
    }
    setIsSubmitting(true);
    setBookingError(null);
    try {
      const targetDoc = doctors.find(d => d.id === selectedDoctorId);
      const res = await createAppointment({
        hospital_id: targetDoc?.hospital_id || 'hosp-101',
        department_id: selectedDept || targetDoc?.department_id || undefined,
        doctor_id: selectedDoctorId,
        patient_name: patientName,
        patient_phone: patientPhone,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        notes
      });
      setConfirmedBooking(res);
      await loadData();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const speechControllerRef = useRef<SpeechRecognitionController | null>(null);

  // Voice AI recording handlers
  const startRecording = async () => {
    try {
      setIsRecording(true);
      const controller = await startListening({
        language: 'Hinglish',
        onError: (err) => console.warn('Voice intake mic error:', err),
      });
      speechControllerRef.current = controller;
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessingVoice(true);
    const controller = speechControllerRef.current;
    speechControllerRef.current = null;

    if (controller) {
      try {
        const { transcript, audioBlob } = await controller.stop();
        const intent = await processVoiceIntake(audioBlob, transcript || undefined);
        setVoiceIntent(intent);
      } catch (err) {
        console.error('Voice intake error:', err);
      } finally {
        setIsProcessingVoice(false);
      }
    } else {
      setIsProcessingVoice(false);
    }
  };

  const confirmVoiceBooking = async () => {
    if (!voiceIntent) return;
    setIsSubmitting(true);
    try {
      const res = await createAppointment({
        hospital_id: 'hosp-101',
        department_id: departments[0]?.id,
        doctor_id: voiceIntent.doctor_id || doctors[0]?.id,
        patient_name: patientName,
        patient_phone: patientPhone,
        appointment_date: voiceIntent.date || selectedDate,
        appointment_time: voiceIntent.suggested_time || '09:00',
        notes: 'Booked via Voice AI Assistant'
      });
      setConfirmedBooking(res);
      setIsVoiceOpen(false);
      setVoiceIntent(null);
      await loadData();
    } catch (err: any) {
      setBookingError(err.message || 'Voice booking failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeToken = queueTokens.find(t => t.status === 'WAITING' || t.status === 'CHECKED_IN');
  console.log('Active token tracker state:', activeToken?.token_number || confirmedBooking?.token?.token_number || bookingError);

  const hospitalList = [
    { name: 'Metro City General Hospital', location: 'Rohini, New Delhi', distance: '2.3 km', status: 'Open Now', recommended: true },
    { name: 'St. Jude Memorial Hospital', location: 'Pitampura, New Delhi', distance: '4.8 km', status: 'Open Now', recommended: false },
    { name: 'Apex Heart Institute', location: 'Shalimar Bagh, New Delhi', distance: '7.1 km', status: 'Open Now', recommended: true },
    { name: 'CityCare Trauma Center', location: 'Janakpuri, New Delhi', distance: '12.4 km', status: '24/7 ER', recommended: false }
  ];

  const countAll = medicalRecords.length;
  const countReports = medicalRecords.filter(r => r.category === 'Test Report').length;
  const countPrescriptions = medicalRecords.filter(r => r.category === 'Prescription').length;
  const countNotes = medicalRecords.filter(r => r.category === 'Doctor Note').length;
  const countRadiology = medicalRecords.filter(r => r.category === 'Radiology').length;
  const countDischarge = medicalRecords.filter(r => r.category === 'Discharge').length;

  const filteredRecords = medicalRecords.filter(r => {
    if (medicalRecordTab === 'reports' && r.category !== 'Test Report') return false;
    if (medicalRecordTab === 'prescriptions' && r.category !== 'Prescription') return false;
    if (medicalRecordTab === 'notes' && r.category !== 'Doctor Note') return false;
    if (medicalRecordTab === 'radiology' && r.category !== 'Radiology') return false;
    if (medicalRecordTab === 'discharge' && r.category !== 'Discharge') return false;

    if (recordSearch.trim()) {
      const q = recordSearch.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDoc = r.doctor.toLowerCase().includes(q);
      const matchHosp = r.hospital.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      const matchDate = r.date.toLowerCase().includes(q);
      const matchSummary = r.summary ? r.summary.toLowerCase().includes(q) : false;
      return matchTitle || matchDoc || matchHosp || matchCat || matchDate || matchSummary;
    }
    return true;
  });

  const handleDownloadRecord = (r: MedicalRecordItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    let content = `================================================================================
MEDCONNECT PULSE ENTERPRISE HEALTHCARE NETWORK
OFFICIAL ELECTRONIC MEDICAL HEALTH RECORD (EHR)
================================================================================

RECORD IDENTIFIER : ${r.id}
DOCUMENT TITLE    : ${r.title}
DOCUMENT TYPE     : ${r.category.toUpperCase()}
DATE OF ISSUE     : ${r.date}
HEALTHCARE FACILITY: ${r.hospital}
ATTENDING PHYSICIAN: ${r.doctor} (${r.doctorSpecialty || 'Specialist'})
RECORD STATUS     : ${r.status || 'OFFICIALLY VERIFIED'}
PATIENT NAME      : ${patientName}
PATIENT PHONE     : ${patientPhone}
VERIFICATION KEY  : SHA256:${Math.random().toString(36).substring(2, 12).toUpperCase()}-MEDPULSE-RLS-SECURE

--------------------------------------------------------------------------------
CLINICAL SUMMARY / DIAGNOSTIC IMPRESSION:
--------------------------------------------------------------------------------
${r.summary || 'Clinical health record archived in verified system repository.'}
`;

    if (r.labResults && r.labResults.length > 0) {
      content += `
--------------------------------------------------------------------------------
QUANTITATIVE LABORATORY RESULTS & REFERENCE INTERVALS:
--------------------------------------------------------------------------------
${String('TEST PARAMETER').padEnd(35)} | ${String('RESULT').padEnd(12)} | ${String('NORMAL RANGE').padEnd(16)} | STATUS
--------------------------------------------------------------------------------
`;
      r.labResults.forEach(l => {
        content += `${l.test.padEnd(35)} | ${(l.result + ' ' + l.unit).padEnd(12)} | ${l.normalRange.padEnd(16)} | ${l.status}\n`;
      });
    }

    if (r.medications && r.medications.length > 0) {
      content += `
--------------------------------------------------------------------------------
PRESCRIBED MEDICATIONS & DOSAGE SCHEDULE:
--------------------------------------------------------------------------------
${String('MEDICATION').padEnd(30)} | ${String('DOSAGE').padEnd(12)} | ${String('FREQUENCY').padEnd(25)} | DURATION
--------------------------------------------------------------------------------
`;
      r.medications.forEach(m => {
        content += `${m.name.padEnd(30)} | ${m.dosage.padEnd(12)} | ${m.frequency.padEnd(25)} | ${m.duration}\n`;
      });
    }

    if (r.details && r.details.length > 0) {
      content += `
--------------------------------------------------------------------------------
CLINICAL OBSERVATIONS & PROTOCOL DETAILS:
--------------------------------------------------------------------------------
`;
      r.details.forEach(d => {
        content += `• ${d}\n`;
      });
    }

    content += `
================================================================================
DIGITALLY AUTHENTICATED BY MEDCONNECT PULSE HL7/FHIR COMPLIANT ENGINE
CONFIDENTIAL MEDICAL DOCUMENT - PROTECTED UNDER ROW LEVEL SECURITY (RLS)
================================================================================
`;

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${r.id}_${r.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadNotice(`✓ Downloaded official report: ${r.title} (${r.id})`);
      setTimeout(() => setDownloadNotice(null), 4500);
    } catch (err: any) {
      alert(`Download error: ${err?.message || 'Failed to download report.'}`);
    }
  };

  const handleSaveUploadedRecord = () => {
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a descriptive title for this medical record.');
      return;
    }
    setUploadError(null);

    const newId = `REC-${Math.floor(100 + Math.random() * 900)}`;
    const newRecord: MedicalRecordItem = {
      id: newId,
      title: uploadTitle.trim(),
      date: uploadDate || new Date().toISOString().split('T')[0],
      category: uploadCategory,
      hospital: uploadHospital,
      doctor: uploadDoctor.trim() || 'Dr. Rajesh Sharma',
      doctorSpecialty: uploadCategory === 'Radiology' ? 'Radiology & Imaging' : uploadCategory === 'Prescription' ? 'Cardiology / Medicine' : 'General Medicine',
      status: 'VERIFIED',
      summary: uploadNotes.trim() || 'Patient uploaded clinical report verified and safely archived.',
      details: uploadNotes ? [uploadNotes] : undefined,
      fileSize: uploadFileName ? `${uploadFileName} (Uploaded)` : '1.2 MB Document',
    };

    setMedicalRecords(prev => [newRecord, ...prev]);
    setIsUploadModalOpen(false);
    setUploadTitle('');
    setUploadNotes('');
    setUploadFileName('');
    setDownloadNotice(`✓ Successfully uploaded & archived: ${newRecord.title}`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // Handler for selecting lab preset panel
  const handleSelectPresetPanel = (panelId: string) => {
    setSelectedPanelId(panelId);
    const panel = LAB_PANEL_PRESETS.find(p => p.id === panelId);
    if (panel) {
      const initialMap: { [id: string]: string } = {};
      panel.biomarkers.forEach(b => {
        initialMap[b.id] = b.defaultResult;
      });
      setManualBiomarkerInputs(initialMap);
      setManualClinicalAnalysis(null);
    }
  };

  // Handler for analyzing manually inputted report
  const handleAnalyzeManualReport = () => {
    const panel = LAB_PANEL_PRESETS.find(p => p.id === selectedPanelId) || LAB_PANEL_PRESETS[0];
    setIsAnalyzingReport(true);
    setTimeout(() => {
      const analysis = analyzeLabReport(panel, manualBiomarkerInputs, currentPatient, {
        hospital: manualReportHospital,
        doctor: manualReportDoctor,
        date: manualReportDate
      });
      setManualClinicalAnalysis(analysis);
      setIsAnalyzingReport(false);
    }, 450);
  };

  // Handler to save analyzed report directly to Medical Records
  const handleSaveAnalysisToRecords = () => {
    if (!manualClinicalAnalysis) return;

    const newRecord: MedicalRecordItem = {
      id: `REC-${Math.floor(100 + Math.random() * 900)}`,
      title: `${manualClinicalAnalysis.title} (Self-Logged)`,
      date: manualClinicalAnalysis.date,
      category: 'Test Report',
      hospital: manualClinicalAnalysis.hospital,
      doctor: manualClinicalAnalysis.doctor,
      doctorSpecialty: 'Diagnostic Laboratory & Pathology',
      status: 'VERIFIED',
      summary: manualClinicalAnalysis.summary,
      labResults: manualClinicalAnalysis.analyzedBiomarkers.map(b => ({
        test: b.test,
        result: b.result,
        unit: b.unit,
        normalRange: b.normalRange,
        status: b.status
      })),
      details: [
        `Clinical Risk Level: ${manualClinicalAnalysis.riskLevel.replace('_', ' ')} (Calculated Index: ${manualClinicalAnalysis.healthScore}/100)`,
        ...manualClinicalAnalysis.findings,
        ...manualClinicalAnalysis.recommendations
      ],
      fileSize: 'Clinical Lab Analysis'
    };

    setMedicalRecords(prev => [newRecord, ...prev]);
    setIsManualReportModalOpen(false);
    setMedicalRecordTab('reports');
    setDownloadNotice(`✓ Added ${newRecord.title} to your Medical Records repository!`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // Handler to download single clinical analysis as text
  const handleDownloadAnalysisTxt = (analysis: ClinicalReportAnalysis) => {
    const divider = '================================================================================';
    let text = `${divider}\nMEDCONNECT PULSE - CLINICAL LAB ANALYSIS REPORT\n${divider}\n\n`;
    text += `DOCUMENT ID       : ${analysis.id}\n`;
    text += `REPORT TITLE      : ${analysis.title}\n`;
    text += `PATIENT NAME      : ${analysis.patientName} (UHID: ${analysis.patientUhid})\n`;
    text += `DATE OF RECORD    : ${analysis.date}\n`;
    text += `FACILITY / LAB    : ${analysis.hospital}\n`;
    text += `ATTENDING DR      : ${analysis.doctor}\n`;
    text += `OVERALL SCORE     : ${analysis.healthScore} / 100 (${analysis.riskLevel.replace('_', ' ')})\n\n`;
    text += `--------------------------------------------------------------------------------\n`;
    text += `SUMMARY & CLINICAL IMPRESSION:\n`;
    text += `--------------------------------------------------------------------------------\n`;
    text += `${analysis.summary}\n\n`;
    text += `--------------------------------------------------------------------------------\n`;
    text += `EVALUATED BIOMARKERS:\n`;
    text += `--------------------------------------------------------------------------------\n`;
    text += `${String('PARAMETER').padEnd(35)} | ${String('VALUE').padEnd(12)} | ${String('NORMAL RANGE').padEnd(16)} | STATUS\n`;
    text += `--------------------------------------------------------------------------------\n`;
    analysis.analyzedBiomarkers.forEach(b => {
      text += `${b.test.padEnd(35)} | ${(b.result + ' ' + b.unit).padEnd(12)} | ${b.normalRange.padEnd(16)} | ${b.status}\n`;
    });
    text += `\n--------------------------------------------------------------------------------\n`;
    text += `RECOMMENDATIONS & LIFESTYLE DIRECTIVES:\n`;
    text += `--------------------------------------------------------------------------------\n`;
    analysis.recommendations.forEach(r => { text += `• ${r}\n`; });
    analysis.lifestyleDirectives.forEach(l => { text += `• ${l}\n`; });
    text += `\n--------------------------------------------------------------------------------\n`;
    text += `QUESTIONS FOR YOUR PHYSICIAN:\n`;
    text += `--------------------------------------------------------------------------------\n`;
    analysis.doctorQuestions.forEach(q => { text += `? ${q}\n`; });
    text += `\n${divider}\nDIGITALLY CERTIFIED BY MEDCONNECT AI CLINICAL REPOSITORY\n${divider}\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.id}_${analysis.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadNotice(`✓ Downloaded ${analysis.title} analysis report`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // Handler for patient login profile switch
  const handleSelectPatientProfile = (p: PatientProfile) => {
    setCurrentPatient(p);
    setIsPatientLoggedIn(true);
    setPatientName(p.fullName);
    setPatientPhone(p.phone);
    localStorage.setItem('medconnect_active_patient', JSON.stringify(p));
    setIsLoginModalOpen(false);
    setLoginError(null);
    setDownloadNotice(`✓ Logged in as ${p.fullName} (${p.uhid}). Personal health records loaded.`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // Handler for manual login submit
  const handleManualLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmailInput.trim()) {
      setLoginError('Please enter your email or UHID number.');
      return;
    }
    const matched = DEMO_PATIENTS.find(
      p => p.email.toLowerCase() === loginEmailInput.toLowerCase() || p.uhid.toLowerCase() === loginEmailInput.toLowerCase()
    );
    if (matched) {
      handleSelectPatientProfile(matched);
    } else {
      const customProfile: PatientProfile = {
        id: `pt-${Date.now().toString().slice(-4)}`,
        uhid: `MED-PT-${Math.floor(1000 + Math.random() * 9000)}`,
        abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: loginEmailInput.includes('@') ? loginEmailInput.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : loginEmailInput,
        email: loginEmailInput.includes('@') ? loginEmailInput : `${loginEmailInput.toLowerCase()}@medconnect.org`,
        phone: '+91-98765-00000',
        age: 35,
        gender: 'Male',
        bloodGroup: 'B+',
        address: 'Metro City Health District',
        emergencyContact: { name: 'Emergency Contact', relation: 'Family', phone: '+91-98765-11111' },
        allergies: ['No Known Drug Allergies (NKDA)'],
        chronicConditions: ['None Reported'],
        primaryDoctor: 'Dr. Rajesh Sharma',
        hospital: 'Metro City General Hospital'
      };
      handleSelectPatientProfile(customProfile);
    }
  };

  // Handler for downloading consolidated EHR health passport
  const handleDownloadConsolidatedHealthReport = () => {
    const reportText = generatedSelfReport ? generatedSelfReport.rawTextReport : generateConsolidatedHealthReport(currentPatient, medicalRecords);
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EHR_Health_Passport_${currentPatient.uhid}_${currentPatient.fullName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadNotice(`✓ Official Health Passport downloaded for ${currentPatient.fullName}!`);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  // Handler for patient submitting their details for site-generated report
  const handleGenerateSelfReport = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selfForm.fullName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    setIsGeneratingSelfReport(true);
    setTimeout(() => {
      const rep = evaluatePatientSelfDetails(selfForm, medicalRecords);
      setGeneratedSelfReport(rep);
      setCurrentPatient(rep.patient);
      setPatientName(rep.patient.fullName);
      setPatientPhone(rep.patient.phone);
      localStorage.setItem('medconnect_active_patient', JSON.stringify(rep.patient));
      setIsGeneratingSelfReport(false);
      setHealthReportViewMode('report');
      setDownloadNotice(`✓ Clinical Health Report successfully generated for ${rep.patient.fullName}!`);
      setTimeout(() => setDownloadNotice(null), 4500);
    }, 450);
  };

  const handleTabClick = (tab: PatientTab, subTabName: string) => {
    setActiveTab(tab);
    onSubTabChange?.(subTabName);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Patient Sub-Navigation Pills */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => handleTabClick('dashboard', 'overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => handleTabClick('book', 'book')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'book'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>

        <button
          onClick={() => handleTabClick('my_appointments', 'overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'my_appointments'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>My Appointments</span>
        </button>

        <button
          onClick={() => handleTabClick('live_queue', 'queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'live_queue'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Live Queue</span>
        </button>

        <button
          onClick={() => handleTabClick('medical_records', 'history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'medical_records'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Medical Records</span>
        </button>

        <button
          onClick={() => handleTabClick('profile', 'overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer active:scale-95 ${
            activeTab === 'profile'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DASHBOARD (Phase 4) */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Welcome Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-blue-600" />
                WELCOME TO MEDCONNECT PULSE
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good Morning, {patientName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Your health matters. We're here to make your healthcare journey simpler and faster.
              </p>
            </div>

            {/* Notification Card Right */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md max-w-sm space-y-2 shrink-0">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Stay on Track</span>
              </div>
              <p className="text-[11px] text-blue-100 leading-relaxed">
                Regular check-ups help you stay healthier for a brighter tomorrow.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('book')}
                className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center space-x-1 pt-1 transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>Book an Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div
              onClick={() => setIsVoiceOpen(true)}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">Talk to AI Receptionist</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Multilingual voice assistant to book appointments instantly.</p>
              </div>
              <div className="text-xs font-bold text-blue-600 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                <span>Start Voice Intake</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('book')}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">Book Appointment</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Select hospital, doctor, and date in 4 easy steps.</p>
              </div>
              <div className="text-xs font-bold text-emerald-600 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                <span>Start Booking</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('medical_records')}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">View Medical Records</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Access lab reports, prescriptions &amp; discharge notes.</p>
              </div>
              <div className="text-xs font-bold text-blue-600 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                <span>View Records</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </div>

          {/* Upcoming Appointment & Live Queue Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Upcoming Appointment Card */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span>Upcoming Appointment</span>
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  Confirmed
                </span>
              </div>

              {myAppointments.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-slate-400 text-[11px]">Doctor</div>
                      <div className="font-bold text-slate-900 text-sm">
                        {doctors.find(d => d.id === myAppointments[0]?.doctor_id)?.name || 'Dr. Rajesh Sharma'}
                      </div>
                      <div className="text-blue-600 font-medium">
                        {doctors.find(d => d.id === myAppointments[0]?.doctor_id)?.specialization || 'Cardiology Specialist'}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-slate-400 text-[11px]">Hospital &amp; Location</div>
                      <div className="font-bold text-slate-900 text-sm">Metro City General</div>
                      <div className="text-slate-500">Rohini, New Delhi</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-slate-400 text-[11px]">Date &amp; Time</div>
                      <div className="font-bold text-slate-900 text-sm">{myAppointments[0]?.appointment_date}</div>
                      <div className="text-blue-700 font-mono font-bold">{myAppointments[0]?.appointment_time}</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="text-slate-400 text-[11px]">OPD Token</div>
                      <div className="font-black text-blue-600 font-mono text-base">
                        #{queueTokens.find(t => t.appointment_id === myAppointments[0]?.id)?.token_number || myAppointments[0]?.appointment_number || 'MED-4029'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">Live Status Active</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedApptForDetails(myAppointments[0])}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer active:scale-95"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('book')}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No upcoming appointments. Book your first consultation above!
                </div>
              )}
            </div>

            {/* Live Queue Status Card */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <ListOrdered className="w-5 h-5 text-blue-600" />
                  <span>Live Queue Status</span>
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>LIVE</span>
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Your Token</span>
                  <span className="font-mono font-black text-blue-700 text-lg">#MED-4029</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Currently Serving</span>
                  <span className="font-mono font-black text-emerald-600 text-lg">#MED-4026</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-slate-400 text-[10px] font-medium">Patients Ahead</div>
                    <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">3</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-slate-400 text-[10px] font-medium">Est. Wait Time</div>
                    <div className="text-xl font-bold text-emerald-600 font-mono mt-0.5">~15 Min</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('live_queue')}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer active:scale-95 shadow-xs"
                >
                  <span>Track Full Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Health Tips Section */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30 shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">HEALTH TIP OF THE DAY</div>
              <div className="font-bold text-white text-sm">Stay Hydrated & Take Micro-Breaks</div>
              <div className="text-xs text-slate-400">Drinking 2.5L of water daily improves cardiovascular circulation and reduces stress levels.</div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: BOOK APPOINTMENT (Phase 5) */}
      {/* ============================================================ */}
      {activeTab === 'book' && (
        <div className="space-y-8">
          
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
                OPD APPOINTMENT WIZARD
              </span>
              <h1 className="text-2xl font-extrabold text-white">Book an Appointment</h1>
              <p className="text-xs text-slate-400">
                Find the right doctor, at the right time — care made simpler.
              </p>
            </div>
            <div className="text-xs text-emerald-400 italic font-semibold">
              Together for a healthier tomorrow
            </div>
          </div>

          {/* Stepper Header */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
            <div
              onClick={() => setBookingStep(1)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                bookingStep === 1
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg'
                  : bookingStep > 1
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              1. Select Hospital
            </div>

            <div
              onClick={() => setBookingStep(2)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                bookingStep === 2
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg'
                  : bookingStep > 2
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              2. Choose Doctor
            </div>

            <div
              onClick={() => setBookingStep(3)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                bookingStep === 3
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg'
                  : bookingStep > 3
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              3. Pick Date & Time
            </div>

            <div
              onClick={() => setBookingStep(4)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                bookingStep === 4
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              4. Confirm
            </div>
          </div>

          {/* Stepper Content Grid */}
          <div className="grid lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              
              {/* STEP 1: SELECT HOSPITAL */}
              {bookingStep === 1 && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">Select Healthcare Facility</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                        <span>Finding nearest care around: <strong className="text-teal-300 font-semibold">{patientManualLocation}</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingPatientLocation(!isEditingPatientLocation)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-teal-500/30 hover:border-teal-500/60 text-teal-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isEditingPatientLocation ? 'Close Location' : 'Change Location (Manual)'}</span>
                    </button>
                  </div>

                  {/* Manual Location Selector Drawer */}
                  {isEditingPatientLocation && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-teal-500/30 space-y-3 animate-fadeIn text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center space-x-1.5">
                          <Compass className="w-3.5 h-3.5 text-teal-400" />
                          <span>Set Your Location Manually</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Sorts nearby hospitals</span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={patientManualLocation}
                          onChange={(e) => setPatientManualLocation(e.target.value)}
                          placeholder="Type your area, locality, or sector (e.g. Rohini Sector 14, Saket)..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl text-xs text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingPatientLocation(false)}
                          className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 transition cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase mr-1">Quick Select:</span>
                        {[
                          'Rohini, New Delhi',
                          'Pitampura, New Delhi',
                          'Janakpuri, New Delhi',
                          'Saket, South Delhi',
                          'Connaught Place, Delhi',
                          'Indiranagar, Bengaluru',
                          'Colaba, Mumbai',
                        ].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setPatientManualLocation(loc);
                              setIsEditingPatientLocation(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                              patientManualLocation === loc
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {loc.split(',')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={hospitalSearch}
                        onChange={e => setHospitalSearch(e.target.value)}
                        placeholder="Search hospital name, area, or specialty..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                      />
                    </div>

                    <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                      <button
                        onClick={() => setHospitalDistanceFilter('all')}
                        className={`px-2.5 py-1 rounded-lg ${hospitalDistanceFilter === 'all' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setHospitalDistanceFilter('5km')}
                        className={`px-2.5 py-1 rounded-lg ${hospitalDistanceFilter === '5km' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        &lt; 5km
                      </button>
                      <button
                        onClick={() => setHospitalDistanceFilter('10km')}
                        className={`px-2.5 py-1 rounded-lg ${hospitalDistanceFilter === '10km' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'text-slate-400'}`}
                      >
                        &lt; 10km
                      </button>
                    </div>
                  </div>

                  {/* Hospital Rows */}
                  <div className="space-y-3">
                    {hospitalList.map((h, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedHospital(h.name);
                          setBookingStep(2);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedHospital === h.name
                            ? 'bg-teal-500/10 border-teal-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 rounded-xl bg-slate-900 text-teal-400 border border-slate-800">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">{h.name}</span>
                              {h.recommended && (
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {h.location} • <span className="text-teal-300 font-mono">{h.distance}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHospital(h.name);
                            setBookingStep(2);
                          }}
                          className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-md"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE DOCTOR */}
              {bookingStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base">Select Doctor & Department</h3>
                    <button onClick={() => setBookingStep(1)} className="text-xs text-slate-400 hover:text-white">
                      ← Back to Hospital
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">Department</label>
                      <select
                        value={selectedDept}
                        onChange={e => {
                          const deptId = e.target.value;
                          setSelectedDept(deptId);
                          const deptDocs = doctors.filter(d => d.department_id === deptId);
                          if (deptDocs[0]) {
                            setSelectedDoctorId(deptDocs[0].id);
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">Available Doctor</label>
                      <select
                        value={selectedDoctorId}
                        onChange={e => {
                          const docId = e.target.value;
                          setSelectedDoctorId(docId);
                          const doc = doctors.find(d => d.id === docId);
                          if (doc?.department_id) {
                            setSelectedDept(doc.department_id);
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                      >
                        {(selectedDept ? doctors.filter(d => d.department_id === selectedDept) : doctors).map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Doctor Info Preview Card */}
                  {doctors.find(d => d.id === selectedDoctorId) && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center space-x-3 text-xs">
                      <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{doctors.find(d => d.id === selectedDoctorId)?.name}</div>
                        <div className="text-slate-400">
                          {doctors.find(d => d.id === selectedDoctorId)?.specialization} • Fee: <span className="text-teal-300 font-mono">₹{doctors.find(d => d.id === selectedDoctorId)?.consultation_fee || 500}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => setBookingStep(3)}
                      disabled={!selectedDoctorId}
                      className="px-6 py-2.5 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300 shadow-lg disabled:opacity-50"
                    >
                      Continue to Pick Date & Time →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PICK DATE & TIME */}
              {bookingStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base">Select Date & Available Slot</h3>
                    <button onClick={() => setBookingStep(2)} className="text-xs text-slate-400 hover:text-white">
                      ← Back to Doctor
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">Appointment Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">
                        Select Time Slot {availableSlots.length > 0 && <span className="text-teal-400 font-mono">({availableSlots.length} available)</span>}
                      </label>

                      {availableSlots.length > 0 ? (
                        <div className="space-y-3">
                          {/* Visual Time Slot Pills */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableSlots.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSelectedSlot(s)}
                                className={`py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all border ${
                                  selectedSlot === s
                                    ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-md shadow-teal-500/30'
                                    : 'bg-slate-950 text-teal-300 border-slate-800 hover:border-teal-500/40 hover:bg-slate-900'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                          <div className="font-bold flex items-center space-x-1.5">
                            <Clock className="w-4 h-4" />
                            <span>No available slots on {selectedDate} for this doctor.</span>
                          </div>
                          <p className="text-[11px] text-amber-200/80">
                            The doctor may not have scheduled clinic hours on this day or all slots may be booked. Please select another date below:
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[1, 2, 3, 4, 5].map(offset => {
                              const targetD = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
                              return (
                                <button
                                  key={targetD}
                                  type="button"
                                  onClick={() => setSelectedDate(targetD)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-teal-300 font-mono text-[11px] hover:border-teal-500/40"
                                >
                                  {targetD}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => setBookingStep(4)}
                      disabled={!selectedSlot}
                      className="px-6 py-2.5 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300 shadow-lg disabled:opacity-50"
                    >
                      Proceed to Final Confirmation →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: CONFIRM */}
              {bookingStep === 4 && (
                <form onSubmit={handleBook} className="space-y-5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-base">Confirm & Generate OPD Token</h3>
                    <button type="button" onClick={() => setBookingStep(3)} className="text-xs text-slate-400 hover:text-white">
                      ← Back to Date
                    </button>
                  </div>

                  {bookingError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                      ⚠️ {bookingError}
                    </div>
                  )}

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 font-mono">
                    <div className="text-slate-400">Hospital: <span className="text-white font-sans">{selectedHospital}</span></div>
                    <div className="text-slate-400">Doctor: <span className="text-teal-300 font-sans">{doctors.find(d => d.id === selectedDoctorId)?.name || 'Selected Doctor'} ({doctors.find(d => d.id === selectedDoctorId)?.specialization})</span></div>
                    <div className="text-slate-400">Date & Slot: <span className="text-emerald-400">{selectedDate}</span> at <span className="text-emerald-400">{selectedSlot || 'None Selected'}</span></div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">Patient Name</label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">Phone Number</label>
                      <input
                        type="text"
                        value={patientPhone}
                        onChange={e => setPatientPhone(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Symptoms / Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                      placeholder="e.g. Follow-up consultation..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedSlot || !selectedDoctorId}
                    className="w-full py-3 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300 shadow-lg shadow-teal-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirming with Database...' : 'Confirm Appointment & Generate Token'}
                  </button>
                </form>
              )}

              {/* SUCCESS CONFIRMATION MODAL */}
              {confirmedBooking && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-scaleUp text-xs">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-black text-white">Appointment Confirmed!</h3>
                      <p className="text-slate-400">Your OPD consultation has been registered in the database.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">OPD Queue Token:</span>
                        <span className="text-xl font-extrabold text-teal-300 tracking-wider font-mono">{confirmedBooking.token.token_number}</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-300 font-sans">
                        <div><strong className="text-slate-400 font-mono">Doctor:</strong> {doctors.find(d => d.id === confirmedBooking.appointment.doctor_id)?.name || 'Doctor'}</div>
                        <div><strong className="text-slate-400 font-mono">Date:</strong> {confirmedBooking.appointment.appointment_date}</div>
                        <div><strong className="text-slate-400 font-mono">Time:</strong> {confirmedBooking.appointment.appointment_time}</div>
                        <div><strong className="text-slate-400 font-mono">Patient:</strong> {confirmedBooking.appointment.patient_name} ({confirmedBooking.appointment.patient_phone})</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => {
                          setConfirmedBooking(null);
                          setActiveTab('live_queue');
                        }}
                        className="py-2.5 px-3 rounded-xl bg-teal-400 text-slate-950 font-bold hover:bg-teal-300 transition text-center"
                      >
                        View Live Queue →
                      </button>

                      <button
                        onClick={() => {
                          setConfirmedBooking(null);
                          setActiveTab('my_appointments');
                        }}
                        className="py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold hover:bg-slate-800 transition text-center"
                      >
                        My Appointments
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setConfirmedBooking(null);
                        setBookingStep(1);
                      }}
                      className="w-full text-center text-slate-400 hover:text-white text-[11px] pt-1"
                    >
                      Book Another Appointment
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                  Why Book with MedConnect Pulse?
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Real-time doctor availability</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Quick and easy booking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Multiple verified hospitals</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Receive instant confirmation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Manage and reschedule anytime</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 to-slate-900 border border-teal-500/30 space-y-2">
                <div className="font-bold text-white text-sm">Your health. Our priority.</div>
                <p className="text-xs text-slate-300">Smarter care for a healthier tomorrow.</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-bold text-white text-sm">Need Help Booking?</div>
                <p className="text-xs text-slate-400">Our voice AI receptionist can book your appointment in seconds.</p>
                <button
                  onClick={() => setIsVoiceOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-md"
                >
                  <Mic className="w-4 h-4 text-slate-950" />
                  <span>Talk to AI Receptionist</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MY APPOINTMENTS (Phase 6) */}
      {/* ============================================================ */}
      {activeTab === 'my_appointments' && (
        <div className="space-y-8">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">APPOINTMENT MANAGEMENT</span>
              <h1 className="text-2xl font-extrabold text-white">My Appointments</h1>
              <p className="text-xs text-slate-400">Manage your appointments, reschedule, or book a new one.</p>
            </div>
            <button
              onClick={() => setActiveTab('book')}
              className="px-4 py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Book New Appointment</span>
            </button>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-8 space-y-6">
              
              {/* Filter Tabs */}
              <div className="flex space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-md">
                <button
                  onClick={() => setAppointmentFilterTab('upcoming')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    appointmentFilterTab === 'upcoming' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setAppointmentFilterTab('past')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    appointmentFilterTab === 'past' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Past
                </button>
                <button
                  onClick={() => setAppointmentFilterTab('cancelled')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    appointmentFilterTab === 'cancelled' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cancelled
                </button>
              </div>

              {/* Appointments List Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
                  {appointmentFilterTab === 'upcoming' ? 'Upcoming Appointments' : appointmentFilterTab === 'past' ? 'Past Consultations' : 'Cancelled Appointments'}
                </h3>

                {myAppointments
                  .filter(a => {
                    if (appointmentFilterTab === 'upcoming') return ['BOOKED', 'SCHEDULED', 'CHECKED_IN', 'IN_QUEUE', 'IN_CONSULTATION'].includes(a.status);
                    if (appointmentFilterTab === 'past') return ['COMPLETED', 'NO_SHOW'].includes(a.status);
                    if (appointmentFilterTab === 'cancelled') return a.status === 'CANCELLED';
                    return true;
                  })
                  .map((appt, i) => (
                  <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 rounded-xl bg-slate-900 text-teal-400 border border-slate-800">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {doctors.find(d => d.id === appt.doctor_id)?.name || 'Dr. Rajesh Sharma'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {doctors.find(d => d.id === appt.doctor_id)?.specialization || 'Cardiology'} • Metro City General
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 rounded-full border border-teal-500/30">
                        {appt.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-900">
                      <div>Date: <span className="text-white">{appt.appointment_date}</span></div>
                      <div>Time: <span className="text-teal-300">{appt.appointment_time}</span></div>
                      <div>Token: <span className="text-emerald-400 font-bold">#{queueTokens.find(t => t.appointment_id === appt.id)?.token_number || 'MED-4029'}</span></div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setSelectedApptForDetails(appt)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 text-xs hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                      {appointmentFilterTab === 'upcoming' && (
                        <>
                          <button onClick={() => setActiveTab('book')} className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 text-xs hover:bg-teal-500/30">
                            Reschedule
                          </button>
                          <button onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel this appointment?')) {
                              try {
                                await cancelAppointment(appt.id);
                                await loadData();
                              } catch (err: any) {
                                alert(err.message || 'Failed to cancel appointment.');
                              }
                            }
                          }} className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs hover:bg-rose-500/30">
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">Quick Consultation Tips</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>• Bring a valid photo ID proof</li>
                  <li>• Arrive 10–15 minutes prior to appointment time</li>
                  <li>• Carry previous medical reports and prescriptions</li>
                  <li>• Reschedule early if you cannot attend</li>
                  <li>• Use online consultation if available</li>
                </ul>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <div className="text-xs font-mono font-bold text-teal-400 uppercase">MEDCONNECT CARE</div>
                <div className="font-bold text-white text-base">Your Health. Our Priority.</div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: LIVE QUEUE (Phase 7) */}
      {/* ============================================================ */}
      {activeTab === 'live_queue' && (
        <div className="space-y-8">
          
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">REAL-TIME OPD TRACKER</span>
            <h1 className="text-2xl font-extrabold text-white">Live Queue</h1>
            <p className="text-xs text-slate-400">Get real-time updates on your appointment and track your turn.</p>
          </div>

          {/* Queue Summary Card */}
          {(() => {
            const targetToken = queueTokens[queueTokens.length - 1];
            const metrics = targetToken ? dbEngine.getPatientQueueMetrics(targetToken.id) : {
              my_token: 'MED-101',
              current_token: 'None',
              queue_position: 1,
              people_ahead: 0,
              estimated_wait_minutes: 0,
              status: 'WAITING' as import('../types/database.types').QueueStatus,
              checked_in_at: null as string | null
            };

            return (
              <>
                <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl grid lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                      <span>Live Database Queue Tracker</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">Metro City General Hospital</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Current Token</div>
                        <div className="font-mono font-bold text-amber-400 text-sm">{metrics.current_token}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Queue Position</div>
                        <div className="font-mono font-bold text-teal-300 text-sm">#{metrics.queue_position}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">People Ahead</div>
                        <div className="font-mono font-bold text-white text-sm">{metrics.people_ahead}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Status</div>
                        <div className="font-mono font-bold text-emerald-400 text-sm">{metrics.status}</div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                    <div className="text-xs text-slate-400 font-mono">MY QUEUE TOKEN</div>
                    <div className="text-3xl font-black text-emerald-400 font-mono">#{metrics.my_token}</div>
                    <div className="text-xs text-teal-300 font-semibold">Estimated Wait: ~{metrics.estimated_wait_minutes} mins</div>
                  </div>
                </div>

                {/* Progress Stepper */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="font-bold text-white text-sm">Consultation Progress</h3>
                  <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold">
                    <div className={`p-3 rounded-2xl border ${metrics.checked_in_at || metrics.status === 'CHECKED_IN' || metrics.status === 'CALLED' || metrics.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                      {metrics.checked_in_at ? '✓ Check-in Done' : '1. Check-In'}
                    </div>
                    <div className={`p-3 rounded-2xl border ${metrics.status === 'WAITING' || metrics.status === 'CHECKED_IN' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-lg' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                      2. In Queue ({metrics.people_ahead} ahead)
                    </div>
                    <div className={`p-3 rounded-2xl border ${metrics.status === 'CALLED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg' : metrics.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                      3. Doctor Room ({metrics.status === 'CALLED' ? 'Active Now' : metrics.status === 'COMPLETED' ? 'Completed' : 'Waiting'})
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Live Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Live Queue Status</h3>
              <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Updating every 30 seconds</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Token No.</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Estimated Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-3 text-slate-400">1</td>
                    <td className="py-3 px-3 text-white font-bold">#MED-4026</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">IN CONSULTATION</span></td>
                    <td className="py-3 px-3 text-slate-300">Now</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-3 text-slate-400">2</td>
                    <td className="py-3 px-3 text-white font-bold">#MED-4027</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px]">WAITING</span></td>
                    <td className="py-3 px-3 text-slate-300">~ 7 Min</td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="py-3 px-3 text-slate-400">3</td>
                    <td className="py-3 px-3 text-white font-bold">#MED-4028</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px]">WAITING</span></td>
                    <td className="py-3 px-3 text-slate-300">~ 14 Min</td>
                  </tr>
                  <tr className="bg-teal-500/10 border-l-4 border-l-teal-400">
                    <td className="py-3 px-3 text-teal-300 font-bold">4</td>
                    <td className="py-3 px-3 text-teal-300 font-black text-sm">#MED-4029 (YOU)</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">YOUR TURN NEXT</span></td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">~ 20 Min</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: MEDICAL RECORDS (Phase 8) */}
      {/* ============================================================ */}
      {activeTab === 'medical_records' && (
        <div className="space-y-8">
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">DIGITAL HEALTH REPOSITORY</span>
              <h1 className="text-2xl font-extrabold text-white">Medical Records</h1>
              <p className="text-xs text-slate-400">Access your medical history, test reports, prescriptions and doctor notes — all in one place.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  handleSelectPresetPanel('cbc');
                  setIsManualReportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-teal-500/25 cursor-pointer transition active:scale-95"
              >
                <FlaskConical className="w-4 h-4 text-slate-950" />
                <span>+ Manually Add Report & Get Results</span>
              </button>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* Patient Identity & Health Passport Access Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-extrabold text-base shrink-0 shadow-md">
                {currentPatient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-white text-base">{currentPatient.fullName}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold flex items-center space-x-1 ${
                    isPatientLoggedIn ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPatientLoggedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{isPatientLoggedIn ? 'VERIFIED PATIENT PROFILE' : 'GUEST / UNVERIFIED'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-teal-400 font-semibold">UHID: {currentPatient.uhid}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <span className="text-slate-500 font-mono text-[11px]">ABHA:</span>
                    <span className="text-slate-300 font-mono">{currentPatient.abhaId}</span>
                  </span>
                  <span>•</span>
                  <span>{currentPatient.age} Y / {currentPatient.gender}</span>
                  <span>•</span>
                  <span className="font-semibold text-rose-300">Blood: {currentPatient.bloodGroup}</span>
                  <span>•</span>
                  <span className="text-slate-300">{currentPatient.hospital}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setHealthReportViewMode('fill_details');
                  setIsHealthReportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-teal-500/20 transition cursor-pointer active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-slate-950" />
                <span>Fill My Details & Generate Report →</span>
              </button>
              <button
                onClick={() => {
                  setHealthReportViewMode('report');
                  setIsHealthReportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95"
              >
                <FileCheck className="w-4 h-4 text-slate-950" />
                <span>📋 Get Health Report</span>
              </button>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-teal-400" />
                <span>Switch Patient</span>
              </button>
            </div>
          </div>

          {/* Fill Details & Automated Site Report Callout Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 border border-teal-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 shrink-0 shadow-md">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-white text-sm">Personalized Health Report Evaluated by Site</span>
                  <span className="px-2 py-0.2 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[9px] font-mono font-bold">
                    AUTOMATED CLINICAL ENGINE
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fill in your own choice of personal metrics, blood pressure, vitals, symptoms & medical history. MedConnect will clinically evaluate your parameters and generate your official Health Report.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setHealthReportViewMode('fill_details');
                setIsHealthReportModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-teal-500/25 transition cursor-pointer shrink-0 active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-slate-950" />
              <span>Fill My Details Now →</span>
            </button>
          </div>

          {/* Download Toast Notification */}
          {downloadNotice && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn shadow-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{downloadNotice}</span>
              </div>
              <button onClick={() => setDownloadNotice(null)} className="text-emerald-400 hover:text-white p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Health Summary Stats Grid (Clickable Category Filters) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <button
              onClick={() => setMedicalRecordTab('all')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'all'
                  ? 'bg-teal-500/15 border-teal-500/50 shadow-lg shadow-teal-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-teal-400 font-mono group-hover:scale-105 transition-transform">{countAll}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Total Records</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">All Categories</div>
            </button>

            <button
              onClick={() => setMedicalRecordTab('reports')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'reports'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-emerald-400 font-mono group-hover:scale-105 transition-transform">{countReports}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Test Reports</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">Lab & Blood</div>
            </button>

            <button
              onClick={() => setMedicalRecordTab('prescriptions')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'prescriptions'
                  ? 'bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-blue-400 font-mono group-hover:scale-105 transition-transform">{countPrescriptions}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Prescriptions</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">Rx Regimens</div>
            </button>

            <button
              onClick={() => setMedicalRecordTab('notes')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'notes'
                  ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-purple-400 font-mono group-hover:scale-105 transition-transform">{countNotes}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Doctor Notes</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">Clinical Visits</div>
            </button>

            <button
              onClick={() => setMedicalRecordTab('radiology')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'radiology'
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-amber-400 font-mono group-hover:scale-105 transition-transform">{countRadiology}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Radiology</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">X-Ray & Scans</div>
            </button>

            <button
              onClick={() => setMedicalRecordTab('discharge')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                medicalRecordTab === 'discharge'
                  ? 'bg-rose-500/15 border-rose-500/50 shadow-lg shadow-rose-500/10 scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="text-2xl font-black text-rose-400 font-mono group-hover:scale-105 transition-transform">{countDischarge}</div>
              <div className="text-[10px] text-slate-300 font-semibold mt-0.5">Discharge</div>
              <div className="text-[9px] text-slate-500 mt-0.5 font-mono">Summaries</div>
            </button>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setMedicalRecordTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'all' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>All Records</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countAll}</span>
              </button>
              <button
                onClick={() => setMedicalRecordTab('reports')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'reports' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Test Reports</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countReports}</span>
              </button>
              <button
                onClick={() => setMedicalRecordTab('prescriptions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'prescriptions' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Prescriptions</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countPrescriptions}</span>
              </button>
              <button
                onClick={() => setMedicalRecordTab('notes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'notes' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Doctor Notes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countNotes}</span>
              </button>
              <button
                onClick={() => setMedicalRecordTab('radiology')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'radiology' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Radiology</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countRadiology}</span>
              </button>
              <button
                onClick={() => setMedicalRecordTab('discharge')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  medicalRecordTab === 'discharge' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Discharge</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 font-mono">{countDischarge}</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={recordSearch}
                onChange={e => setRecordSearch(e.target.value)}
                placeholder="Search test name, doctor, hospital..."
                className="w-full pl-8 pr-8 py-2 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
              {recordSearch && (
                <button
                  onClick={() => setRecordSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Record List */}
          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
                <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-white font-bold text-sm">No Medical Records Found</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No records match "{recordSearch}" in {medicalRecordTab === 'all' ? 'any category' : medicalRecordTab}.
                </p>
                <button
                  onClick={() => { setRecordSearch(''); setMedicalRecordTab('all'); }}
                  className="px-3.5 py-1.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-semibold hover:bg-teal-500/30 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredRecords.map((r) => {
                const getBadgeStyle = () => {
                  switch (r.category) {
                    case 'Test Report':
                      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                    case 'Prescription':
                      return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                    case 'Doctor Note':
                      return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
                    case 'Radiology':
                      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                    case 'Discharge':
                      return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                    default:
                      return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
                  }
                };

                const getIcon = () => {
                  switch (r.category) {
                    case 'Test Report':
                      return <Activity className="w-5 h-5 text-emerald-400" />;
                    case 'Prescription':
                      return <Stethoscope className="w-5 h-5 text-blue-400" />;
                    case 'Doctor Note':
                      return <User className="w-5 h-5 text-purple-400" />;
                    case 'Radiology':
                      return <Eye className="w-5 h-5 text-amber-400" />;
                    case 'Discharge':
                      return <ShieldCheck className="w-5 h-5 text-rose-400" />;
                    default:
                      return <FileText className="w-5 h-5 text-teal-400" />;
                  }
                };

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecordForDetail(r)}
                    className="p-4 bg-slate-900 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-900/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all group shadow-md"
                  >
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                        {getIcon()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">
                            {r.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">#{r.id}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-slate-300 font-medium">{r.hospital}</span>
                          <span>•</span>
                          <span>{r.doctor}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{r.date}</span>
                          {r.fileSize && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-teal-400/80 text-[11px]">{r.fileSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-full border ${getBadgeStyle()}`}>
                        {r.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecordForDetail(r);
                        }}
                        title="View Full Record Details"
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/40 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDownloadRecord(r, e)}
                        title="Download Document"
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Security Banner */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4 shadow-xl">
            <ShieldCheck className="w-6 h-6 text-teal-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Your Data is Secure & Encrypted</div>
              <div className="text-xs text-slate-400">All medical records are encrypted and protected by Supabase Row Level Security (RLS) and HIPAA compliance protocols.</div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: PATIENT PROFILE (Phase 9) */}
      {/* ============================================================ */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">PATIENT ACCOUNT</span>
            <h1 className="text-2xl font-extrabold text-white">My Profile</h1>
            <p className="text-xs text-slate-400">Manage your personal information, preferences and account settings.</p>
          </div>

          {/* Profile Header Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-teal-400 flex items-center justify-center text-teal-300 font-black text-xl">
                {patientName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white">{patientName}</h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40">
                    Verified Patient
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">aarav.malhotra@patient.org • +91-9876543210</div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700"
            >
              {isEditingProfile ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>

          {/* Personal & Health Info Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Personal Information */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 mb-0.5">Full Name</div>
                  <div className="font-bold text-white">{patientName}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Date of Birth</div>
                  <div className="font-bold text-white">1992-04-14</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Gender</div>
                  <div className="font-bold text-white">Male</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Emergency Contact</div>
                  <div className="font-bold text-teal-300">+91-9876500000</div>
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Health Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500 mb-0.5">Blood Group</div>
                  <div className="font-bold text-rose-400 font-mono text-sm">O Positive (O+)</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Known Allergies</div>
                  <div className="font-bold text-white">Penicillin</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Chronic Conditions</div>
                  <div className="font-bold text-white">None</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Current Medications</div>
                  <div className="font-bold text-white">Multivitamins</div>
                </div>
              </div>
            </div>

          </div>

          {/* Danger Zone */}
          <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-3">
            <div className="font-bold text-rose-400 text-sm">Danger Zone</div>
            <p className="text-xs text-slate-300">Permanently delete your MedConnect Pulse patient account and historical records.</p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
            >
              Delete My Account
            </button>
          </div>

          {/* Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-rose-400 text-lg">Confirm Account Deletion</h3>
                <p className="text-xs text-slate-300">
                  Type <span className="font-mono font-bold text-white">DELETE</span> below to confirm. This action cannot be undone.
                </p>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={e => setDeleteConfirmationInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  placeholder="Type DELETE"
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                    Cancel
                  </button>
                  <button
                    disabled={deleteConfirmationInput !== 'DELETE'}
                    onClick={() => {
                      alert('Account deletion confirmed.');
                      setShowDeleteModal(false);
                    }}
                    className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Voice AI Intake Modal */}
      {isVoiceOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-lg w-full bg-slate-900 border border-teal-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">Multilingual AI Voice Receptionist</h3>
              </div>
              <button onClick={() => setIsVoiceOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/40 flex items-center justify-center mx-auto relative">
                {isRecording && <span className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping" />}
                <Mic className={`w-8 h-8 ${isRecording ? 'text-teal-300' : 'text-slate-400'}`} />
              </div>

              {isRecording ? (
                <div>
                  <div className="text-sm font-bold text-teal-300">Listening to your voice...</div>
                  <p className="text-xs text-slate-400 mt-1">Speak your symptoms, preferred doctor, or appointment time.</p>
                  <button
                    onClick={stopRecording}
                    className="mt-4 px-4 py-2 bg-rose-500 text-white font-semibold text-xs rounded-xl hover:bg-rose-600 transition-colors inline-flex items-center space-x-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Stop Recording & Process</span>
                  </button>
                </div>
              ) : isProcessingVoice ? (
                <div className="space-y-2">
                  <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto" />
                  <div className="text-xs text-slate-300">Sarvam STT & OpenAI Intent Parsing...</div>
                </div>
              ) : voiceIntent ? (
                <div className="text-left space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs">
                  <div className="font-bold text-teal-400">Structured Intent Recognized:</div>
                  <p className="text-slate-300">{voiceIntent.ai_message}</p>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg space-y-1 font-mono text-[11px]">
                    <div>Doctor: <span className="text-white">{voiceIntent.doctor_name}</span></div>
                    <div>Date: <span className="text-white">{voiceIntent.date}</span></div>
                    <div>Slot: <span className="text-teal-300">{voiceIntent.suggested_time}</span></div>
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => setVoiceIntent(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={confirmVoiceBooking}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-teal-400 text-slate-950 font-bold rounded-lg text-xs hover:bg-teal-300"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300 transition-colors shadow-lg shadow-teal-500/20"
                  >
                    Start Voice Recording
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPOINTMENT DETAILS MODAL */}
      {selectedApptForDetails && (() => {
        const matchedDoc = doctors.find(d => d.id === selectedApptForDetails.doctor_id);
        const matchedDept = departments.find(d => d.id === (selectedApptForDetails.department_id || matchedDoc?.department_id));
        const matchedToken = queueTokens.find(t => t.appointment_id === selectedApptForDetails.id);
        const tokenNum = matchedToken?.token_number || selectedApptForDetails.appointment_number || 'MED-4029';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scaleUp text-xs relative my-8">
              {/* Close Button */}
              <button
                onClick={() => setSelectedApptForDetails(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="space-y-1 pr-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">OPD Appointment Details</h3>
                    <p className="text-slate-400 text-[11px]">Comprehensive token verification & booking record</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    selectedApptForDetails.status === 'CANCELLED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : selectedApptForDetails.status === 'COMPLETED'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {selectedApptForDetails.status}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-mono text-[11px]">Ref: {selectedApptForDetails.id}</span>
                </div>
              </div>

              {/* OPD Live Token Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-950 to-slate-900 border border-teal-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-teal-400 font-bold">OPD Live Queue Token</div>
                  <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5 tracking-wide">
                    #{tokenNum}
                  </div>
                  <div className="text-[11px] text-teal-200/80 font-medium">
                    {matchedToken?.sequence_number ? `Queue Position #${matchedToken.sequence_number} • Live Active` : 'Confirmed OPD Pass'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tokenNum);
                    setCopiedTokenId(true);
                    setTimeout(() => setCopiedTokenId(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedTokenId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>

              {/* Detail Cards Grid */}
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {/* Doctor */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                    <span>Attending Specialist</span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    {matchedDoc?.name || 'Dr. Rajesh Sharma'}
                  </div>
                  <div className="text-teal-400 text-[11px]">
                    {matchedDoc?.specialization || 'Cardiology Specialist'}
                  </div>
                  <div className="text-slate-400 text-[10px] pt-1">
                    Fee: <span className="text-emerald-400 font-bold">₹{matchedDoc?.consultation_fee || 500}</span> (Paid/Pay at Counter)
                  </div>
                </div>

                {/* Hospital */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Hospital & Department</span>
                  </div>
                  <div className="font-bold text-white text-sm">Metro City General</div>
                  <div className="text-slate-300 text-[11px]">
                    {matchedDept?.name || 'Cardiology OPD'} • 2nd Floor
                  </div>
                  <div className="text-slate-400 text-[10px] flex items-center space-x-1 pt-1">
                    <MapPin className="w-3 h-3 text-rose-400 inline" />
                    <span>Rohini, New Delhi</span>
                  </div>
                </div>

                {/* Schedule */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>Appointment Schedule</span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    {selectedApptForDetails.appointment_date}
                  </div>
                  <div className="text-teal-300 font-mono font-bold text-xs flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-teal-400 inline" />
                    <span>{selectedApptForDetails.appointment_time}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] pt-1">
                    Est. Duration: {matchedDoc?.consultation_duration_minutes || 15} mins
                  </div>
                </div>

                {/* Patient */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>Patient Profile</span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    {selectedApptForDetails.patient_name || profile?.full_name || 'Aarav Malhotra'}
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    {selectedApptForDetails.patient_phone || '+91-9876543210'}
                  </div>
                  <div className="text-slate-400 text-[10px] pt-1">
                    Verification: <span className="text-teal-400 font-medium">Auto-synced</span>
                  </div>
                </div>
              </div>

              {/* Patient Symptoms/Notes */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-semibold">Consultation Notes / Reported Symptoms</div>
                <div className="text-slate-200 text-xs">
                  {selectedApptForDetails.notes || 'Routine consultation & follow-up evaluation.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedApptForDetails(null);
                      setActiveTab('live_queue');
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-400 text-slate-950 font-bold hover:bg-teal-300 transition-colors text-xs cursor-pointer shadow-lg shadow-teal-500/20"
                  >
                    Track in Live Queue →
                  </button>

                  {selectedApptForDetails.status !== 'CANCELLED' && selectedApptForDetails.status !== 'COMPLETED' && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to cancel this appointment?')) {
                          try {
                            await cancelAppointment(selectedApptForDetails.id);
                            await loadData();
                            setSelectedApptForDetails(null);
                          } catch (err: any) {
                            alert(err.message || 'Failed to cancel appointment.');
                          }
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold hover:bg-rose-500/30 transition-colors cursor-pointer"
                    >
                      Cancel Appt
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MEDICAL RECORD DETAILS MODAL */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-scaleUp text-xs relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedRecordForDetail(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1.5 pr-8 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  {selectedRecordForDetail.category}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-400 text-[11px]">ID: #{selectedRecordForDetail.id}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-mono text-[10px] flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{selectedRecordForDetail.status || 'VERIFIED'}</span>
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{selectedRecordForDetail.title}</h2>
              <p className="text-slate-400 text-xs flex flex-wrap items-center gap-x-2">
                <span className="text-slate-200 font-semibold">{selectedRecordForDetail.hospital}</span>
                <span>•</span>
                <span>{selectedRecordForDetail.doctor} ({selectedRecordForDetail.doctorSpecialty || 'Specialist'})</span>
                <span>•</span>
                <span className="font-mono text-teal-400">{selectedRecordForDetail.date}</span>
              </p>
            </div>

            {/* Clinical Summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">Clinical Impression & Findings</div>
              <p className="text-slate-200 text-xs leading-relaxed">
                {selectedRecordForDetail.summary || 'Official clinical document archived under verified electronic health record protocol.'}
              </p>
            </div>

            {/* Laboratory Test Table if Test Report */}
            {selectedRecordForDetail.labResults && selectedRecordForDetail.labResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
                  <span>Diagnostic Lab Parameters</span>
                  <span className="text-[10px] text-teal-400 font-mono">Reference Range Normal</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Test Parameter</th>
                        <th className="p-3">Patient Value</th>
                        <th className="p-3">Standard Reference</th>
                        <th className="p-3">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono text-[11px]">
                      {selectedRecordForDetail.labResults.map((lab, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 text-slate-200 font-sans font-medium">{lab.test}</td>
                          <td className="p-3 font-bold text-white">
                            {lab.result} <span className="text-[10px] text-slate-400">{lab.unit}</span>
                          </td>
                          <td className="p-3 text-slate-400">{lab.normalRange}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              lab.status === 'NORMAL'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {lab.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Medications Table if Prescription */}
            {selectedRecordForDetail.medications && selectedRecordForDetail.medications.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">Prescription Medication Regimen</div>
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Medication Name</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Schedule</th>
                        <th className="p-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-[11px]">
                      {selectedRecordForDetail.medications.map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-bold text-white">{med.name}</td>
                          <td className="p-3 font-mono text-teal-300">{med.dosage}</td>
                          <td className="p-3 text-slate-300">{med.frequency}</td>
                          <td className="p-3 font-mono text-slate-400">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clinical Observations / Notes */}
            {selectedRecordForDetail.details && selectedRecordForDetail.details.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">Clinical Notes & Discharge Directives</div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  {selectedRecordForDetail.details.map((d, idx) => (
                    <li key={idx} className="leading-relaxed">{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Document Verification Footer */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center space-x-2 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Digitally Authenticated by MedConnect Pulse EHR Engine</span>
              </div>
              <div className="font-mono text-slate-500 text-[10px]">
                {selectedRecordForDetail.fileSize || 'Standard Verified Health Format'}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Record</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadRecord(selectedRecordForDetail)}
                  className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold transition-colors text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document (.txt)</span>
                </button>
                <button
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD RECORD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-6 md:p-8 max-w-xl w-full space-y-5 shadow-2xl animate-scaleUp text-xs relative my-8">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-8 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Upload Medical Health Record</h3>
                  <p className="text-slate-400 text-[11px]">Digitally archive test reports, prescriptions, or discharge papers</p>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  Document / Test Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Abdominal Ultrasound Digital Report"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Record Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Test Report">Test Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Doctor Note">Doctor Note</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Discharge">Discharge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Date of Record
                  </label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={e => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Healthcare Facility
                  </label>
                  <select
                    value={uploadHospital}
                    onChange={e => setUploadHospital(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Metro City General Hospital">Metro City General Hospital</option>
                    <option value="Apex Heart Institute">Apex Heart Institute</option>
                    <option value="St. Jude Memorial Hospital">St. Jude Memorial Hospital</option>
                    <option value="CityCare Trauma Center">CityCare Trauma Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Attending Physician
                  </label>
                  <input
                    type="text"
                    value={uploadDoctor}
                    onChange={e => setUploadDoctor(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  Clinical Notes & Summary
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  rows={3}
                  placeholder="Summary of lab findings, diagnosis, or prescription instructions..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none resize-none"
                />
              </div>

              {/* File Attachment Dropzone */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  File Attachment (PDF / DICOM / Image)
                </label>
                <div
                  onClick={() => {
                    const mockNames = ['lab_report_scan.pdf', 'prescription_signed.pdf', 'chest_xray_dicom.png', 'clinical_summary.pdf'];
                    const picked = mockNames[Math.floor(Math.random() * mockNames.length)];
                    setUploadFileName(picked);
                  }}
                  className="border-2 border-dashed border-slate-800 hover:border-teal-500/50 bg-slate-950 rounded-2xl p-4 text-center cursor-pointer transition group"
                >
                  <FileText className="w-7 h-7 text-slate-500 group-hover:text-teal-400 mx-auto mb-1.5 transition-colors" />
                  {uploadFileName ? (
                    <div className="space-y-1">
                      <span className="font-mono text-teal-300 font-bold text-xs">{uploadFileName}</span>
                      <span className="block text-[10px] text-emerald-400 font-medium">✓ File ready for upload</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-300 font-medium text-xs block">Click to Attach Document File</span>
                      <span className="text-slate-500 text-[10px]">Supports PDF, JPG, PNG, DICOM up to 25MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUploadedRecord}
                className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition cursor-pointer flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save to Health Repository</span>
              </button>
            </div>
          </div>
        </div>
      )}

    {/* MANUAL LAB REPORT & CLINICAL RESULTS MODAL */}
      {isManualReportModalOpen && (() => {
        const activePanel = LAB_PANEL_PRESETS.find(p => p.id === selectedPanelId) || LAB_PANEL_PRESETS[0];

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-teal-500/35 rounded-3xl p-6 md:p-8 max-w-4xl w-full space-y-6 shadow-2xl animate-scaleUp text-xs relative my-8 max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => setIsManualReportModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="space-y-1 pr-8 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shadow-md">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Manual Lab Report Entry & Clinical AI Results</h3>
                    <p className="text-slate-400 text-xs">
                      Manually input your diagnostic lab values to instantly calculate clinical health score, detect out-of-range biomarkers, and generate actionable health directives.
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Presets Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold">
                  Select Diagnostic Test Panel Preset:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {LAB_PANEL_PRESETS.map((panel) => {
                    const isSelected = panel.id === selectedPanelId;
                    return (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => handleSelectPresetPanel(panel.id)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold shadow-md shadow-teal-500/10 scale-[1.02]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-semibold leading-tight line-clamp-1">{panel.name.split('(')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">{panel.category}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{activePanel.description}</span>
                </div>
              </div>

              {/* Test Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Date of Test *
                  </label>
                  <input
                    type="date"
                    value={manualReportDate}
                    onChange={e => setManualReportDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Diagnostic Lab / Hospital
                  </label>
                  <input
                    type="text"
                    value={manualReportHospital}
                    onChange={e => setManualReportHospital(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. Metro City General Lab"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                    Attending Physician / Pathologist
                  </label>
                  <input
                    type="text"
                    value={manualReportDoctor}
                    onChange={e => setManualReportDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                    placeholder="e.g. Dr. Rajesh Sharma"
                  />
                </div>
              </div>

              {/* Biomarker Values Input Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold">
                    Enter Parameter Values ({activePanel.biomarkers.length} Biomarkers):
                  </label>
                  <span className="text-[10px] text-slate-500">Values pre-filled with standard baseline. Modify as desired.</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Biomarker / Test Name</th>
                        <th className="p-3">Reference Interval</th>
                        <th className="p-3">Your Result Value</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3">Live Indicator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono text-[11px]">
                      {activePanel.biomarkers.map((b) => {
                        const currentVal = manualBiomarkerInputs[b.id] ?? b.defaultResult;
                        const num = parseFloat(currentVal.replace(/[^0-9.]/g, ''));
                        const isElevated = !isNaN(num) && num > b.max;
                        const isLow = !isNaN(num) && num < b.min;

                        return (
                          <tr key={b.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 text-slate-200 font-sans">
                              <div className="font-bold text-white">{b.test}</div>
                              <div className="text-[10px] text-slate-500">{b.description}</div>
                            </td>
                            <td className="p-3 text-slate-400">{b.normalRange}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualBiomarkerInputs(prev => ({ ...prev, [b.id]: val }));
                                  setManualClinicalAnalysis(null);
                                }}
                                className={`w-28 px-2.5 py-1.5 rounded-lg border bg-slate-950 text-xs font-mono font-bold focus:outline-none ${
                                  isElevated
                                    ? 'border-amber-500/60 text-amber-300'
                                    : isLow
                                    ? 'border-blue-500/60 text-blue-300'
                                    : 'border-slate-800 text-white focus:border-teal-500'
                                }`}
                              />
                            </td>
                            <td className="p-3 text-slate-400">{b.unit}</td>
                            <td className="p-3">
                              {isElevated ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  HIGH ▲
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  LOW ▼
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  NORMAL ✓
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button: Calculate & Generate Results */}
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  disabled={isAnalyzingReport}
                  onClick={handleAnalyzeManualReport}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-xl shadow-teal-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
                      <span>Evaluating Clinical Biomarkers...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>⚡ Calculate & Generate Clinical Interpretation</span>
                    </>
                  )}
                </button>
              </div>

              {/* GENERATED CLINICAL ANALYSIS RESULTS SECTION */}
              {manualClinicalAnalysis && (
                <div className="space-y-5 pt-4 border-t border-slate-800 animate-fadeIn">
                  
                  {/* Emergency Warning Banner if any critical parameters */}
                  {manualClinicalAnalysis.emergencyWarning && (
                    <div className="p-4 bg-rose-500/20 border-2 border-rose-500/60 rounded-2xl flex items-start space-x-3 text-rose-200">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wide">Critical Clinical Flag Detected</div>
                        <p className="text-xs mt-0.5">{manualClinicalAnalysis.emergencyWarning}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Calculated Health Index</div>
                      <div className={`text-3xl font-black font-mono ${
                        manualClinicalAnalysis.healthScore >= 85 ? 'text-emerald-400' : manualClinicalAnalysis.healthScore >= 65 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {manualClinicalAnalysis.healthScore} <span className="text-xs text-slate-500">/ 100</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Composite Biomarker Score</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Clinical Risk Profile</div>
                      <div className="pt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          manualClinicalAnalysis.riskLevel === 'OPTIMAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : manualClinicalAnalysis.riskLevel === 'MILD_RISK'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : manualClinicalAnalysis.riskLevel === 'MODERATE_RISK'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {manualClinicalAnalysis.riskLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {manualClinicalAnalysis.abnormalCount === 0 ? 'All Parameters Optimal' : `${manualClinicalAnalysis.abnormalCount} Parameter(s) Deviated`}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Evaluated Specimen</div>
                      <div className="text-lg font-bold text-white mt-1">{manualClinicalAnalysis.title}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{manualClinicalAnalysis.date} • {manualClinicalAnalysis.hospital}</div>
                    </div>
                  </div>

                  {/* Clinical Findings & Interpretation Box */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/20 space-y-3">
                    <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs">
                      <Activity className="w-4 h-4" />
                      <span>Clinical Summary & Diagnostic Findings</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {manualClinicalAnalysis.summary}
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {manualClinicalAnalysis.findings.map((f, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                          <span className="text-teal-400 shrink-0">•</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Biomarkers Detail Table with Clinical Notes */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                      Evaluated Biomarker Parameter Findings:
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-3">Biomarker</th>
                            <th className="p-3">Result Value</th>
                            <th className="p-3">Reference Range</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Clinical Evaluation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono text-[11px]">
                          {manualClinicalAnalysis.analyzedBiomarkers.map((b, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="p-3 text-white font-sans font-bold">{b.test}</td>
                              <td className="p-3 font-bold text-white">
                                {b.result} <span className="text-[10px] text-slate-400">{b.unit}</span>
                              </td>
                              <td className="p-3 text-slate-400">{b.normalRange}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  b.status === 'NORMAL'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : b.status === 'ELEVATED'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300 font-sans text-[11px]">{b.clinicalNote}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendations & Lifestyle Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Clinical Directives & Nutrition</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                        {manualClinicalAnalysis.recommendations.map((r, idx) => (
                          <li key={idx} className="leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Questions For Your Doctor</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                        {manualClinicalAnalysis.doctorQuestions.map((q, idx) => (
                          <li key={idx} className="leading-relaxed">{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Bar for Generated Report */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-slate-400 text-xs">
                      <ShieldCheck className="w-4 h-4 text-teal-400" />
                      <span>Ready to archive or download as verified health document</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDownloadAnalysisTxt(manualClinicalAnalysis)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Analysis (.txt)</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      <button
                        onClick={handleSaveAnalysisToRecords}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>Save to Medical Records</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Close Bottom Button */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManualReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* PATIENT LOGIN & ACCOUNT SWITCHER MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-teal-500/35 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-scaleUp text-xs relative my-8">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-8 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shadow-md">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Patient EHR Login & Identity Verification</h3>
                  <p className="text-slate-400 text-xs">Log in to your patient account to access personal health records & reports</p>
                </div>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Quick 1-Click Patient Accounts */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-mono text-teal-400 uppercase font-bold">
                1-Click Quick Select Patient Account:
              </div>
              <div className="space-y-2">
                {DEMO_PATIENTS.map((p) => {
                  const isCurrent = currentPatient.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatientProfile(p)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-teal-500/15 border-teal-400 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-xs">
                          {p.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                            <span>{p.fullName}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/30 text-teal-300 font-mono">ACTIVE</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.uhid} • {p.age} Y ({p.gender}) • Blood: {p.bloodGroup}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {p.chronicConditions.join(', ')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-bold shrink-0 hover:bg-teal-500/30"
                      >
                        {isCurrent ? 'Current' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manual Credentials Form */}
            <form onSubmit={handleManualLoginSubmit} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                Or Sign In with Email / UHID:
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Email Address or UHID *
                </label>
                <input
                  type="text"
                  value={loginEmailInput}
                  onChange={e => setLoginEmailInput(e.target.value)}
                  placeholder="e.g. rohit.verma@example.com or MED-PT-8821"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPasswordInput}
                  onChange={e => setLoginPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs transition shadow-lg shadow-teal-500/20 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-950" />
                <span>Log In & Access Health Records</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATED EHR PATIENT HEALTH REPORT (HEALTH PASSPORT) MODAL */}
      {isHealthReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-teal-500/35 rounded-3xl p-6 md:p-8 max-w-3xl w-full space-y-6 shadow-2xl animate-scaleUp text-xs relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsHealthReportModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Official Header */}
            <div className="border-b border-slate-800 pb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shadow-md">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Consolidated EHR Patient Health Passport</h3>
                    <p className="text-slate-400 text-[11px]">Official Longitudinal Medical Summary & Health Stack Record</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ABDM / HIPAA COMPLIANT</span>
                </span>
              </div>

              {/* View Mode Switcher Tabs */}
              <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setHealthReportViewMode('report')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    healthReportViewMode === 'report'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Official Health Report & Passport</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHealthReportViewMode('fill_details')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    healthReportViewMode === 'fill_details'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Fill / Customize My Details</span>
                  <span className="px-1.5 py-0.2 rounded bg-teal-400/20 text-teal-300 text-[9px] font-mono font-bold">
                    YOUR CHOICE
                  </span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: FILL / CUSTOMIZE DETAILS BY PATIENT'S CHOICE */}
            {healthReportViewMode === 'fill_details' && (
              <form onSubmit={handleGenerateSelfReport} className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-teal-950/40 border border-teal-500/30 rounded-2xl space-y-1">
                  <div className="font-bold text-white text-xs flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>Personalized Clinical Health Assessment</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Fill in your personal metrics, vitals, symptoms, and medical background below by your choice. MedConnect's clinical AI engine will automatically evaluate your data and generate your official Health Report.
                  </p>
                </div>

                {/* Section 1: Demographics */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>1. Patient Demographics & Identification</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={selfForm.fullName}
                        onChange={e => setSelfForm(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="e.g. Ayank"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Age (Years) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        value={selfForm.age}
                        onChange={e => setSelfForm(prev => ({ ...prev, age: parseInt(e.target.value) || 30 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Gender
                      </label>
                      <select
                        value={selfForm.gender}
                        onChange={e => setSelfForm(prev => ({ ...prev, gender: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Blood Group *
                      </label>
                      <select
                        value={selfForm.bloodGroup}
                        onChange={e => setSelfForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-rose-400 font-bold focus:border-teal-500 focus:outline-none"
                      >
                        <option value="A+">A+ (Positive)</option>
                        <option value="A-">A- (Negative)</option>
                        <option value="B+">B+ (Positive)</option>
                        <option value="B-">B- (Negative)</option>
                        <option value="O+">O+ (Positive)</option>
                        <option value="O-">O- (Negative)</option>
                        <option value="AB+">AB+ (Positive)</option>
                        <option value="AB-">AB- (Negative)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={selfForm.phone}
                        onChange={e => setSelfForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91-98765-00000"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={selfForm.email}
                        onChange={e => setSelfForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="patient@example.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Vitals & Body Metrics */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      <span>2. Body Composition & Measured Vitals</span>
                    </div>
                    {/* Live BMI Preview */}
                    {(() => {
                      const h = (selfForm.heightCm || 170) / 100;
                      const bmiVal = ((selfForm.weightKg || 70) / (h * h)).toFixed(1);
                      return (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                          Live Calculated BMI: {bmiVal} kg/m²
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Height (cm) *
                      </label>
                      <input
                        type="number"
                        min="80"
                        max="250"
                        value={selfForm.heightCm}
                        onChange={e => setSelfForm(prev => ({ ...prev, heightCm: parseFloat(e.target.value) || 170 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Weight (kg) *
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="300"
                        value={selfForm.weightKg}
                        onChange={e => setSelfForm(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 70 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Systolic BP (mmHg) *
                      </label>
                      <input
                        type="number"
                        min="70"
                        max="240"
                        value={selfForm.systolicBp}
                        onChange={e => setSelfForm(prev => ({ ...prev, systolicBp: parseInt(e.target.value) || 120 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Diastolic BP (mmHg) *
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="150"
                        value={selfForm.diastolicBp}
                        onChange={e => setSelfForm(prev => ({ ...prev, diastolicBp: parseInt(e.target.value) || 80 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Heart Rate (bpm)
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="200"
                        value={selfForm.restingHeartRate}
                        onChange={e => setSelfForm(prev => ({ ...prev, restingHeartRate: parseInt(e.target.value) || 72 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Fasting Sugar (mg/dL)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        value={selfForm.bloodSugarFasting || ''}
                        onChange={e => setSelfForm(prev => ({ ...prev, bloodSugarFasting: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        placeholder="e.g. 96"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Oxygen SpO2 (%)
                      </label>
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={selfForm.oxygenSaturation || 98}
                        onChange={e => setSelfForm(prev => ({ ...prev, oxygenSaturation: parseFloat(e.target.value) || 98 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Cholesterol (mg/dL)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="400"
                        value={selfForm.cholesterolTotal || ''}
                        onChange={e => setSelfForm(prev => ({ ...prev, cholesterolTotal: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        placeholder="e.g. 185"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Symptoms / Concerns (Checkable chips) */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <label className="block text-[11px] font-mono text-teal-400 uppercase font-bold">
                    3. Current Symptoms / Health Concerns (Select Any That Apply):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Chest Discomfort / Tightness',
                      'Shortness of Breath',
                      'Chronic Fatigue / Lethargy',
                      'Frequent Headaches',
                      'Joint Pain / Stiffness',
                      'Dizziness / Vertigo',
                      'Acid Reflux / Dyspepsia',
                      'Sleep Disturbance',
                      'Healthy / Routine Wellness Check'
                    ].map((sym) => {
                      const isChecked = selfForm.symptoms.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            setSelfForm(prev => {
                              const exists = prev.symptoms.includes(sym);
                              if (exists) return { ...prev, symptoms: prev.symptoms.filter(s => s !== sym) };
                              return { ...prev, symptoms: [...prev.symptoms, sym] };
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                            isChecked
                              ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-teal-400' : 'bg-slate-600'}`} />
                          <span>{sym}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Allergies & Chronic Conditions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-[11px] font-mono text-rose-400 uppercase font-bold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Known Drug Allergies</span>
                    </label>
                    <input
                      type="text"
                      value={selfForm.allergies.join(', ')}
                      onChange={e => {
                        const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSelfForm(prev => ({ ...prev, allergies: vals }));
                      }}
                      placeholder="e.g. Penicillin, Sulfa, None (NKDA)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-500">Separate multiple allergies with commas.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-[11px] font-mono text-amber-400 uppercase font-bold flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Chronic Medical Diagnoses</span>
                    </label>
                    <input
                      type="text"
                      value={selfForm.chronicConditions.join(', ')}
                      onChange={e => {
                        const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSelfForm(prev => ({ ...prev, chronicConditions: vals }));
                      }}
                      placeholder="e.g. Hypertension, Diabetes, Thyroid, None"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-500">Separate multiple diagnoses with commas.</div>
                  </div>
                </div>

                {/* Section 5: Lifestyle & Daily Habits */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>5. Lifestyle, Nutrition & Sleep Habits</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Smoking Status
                      </label>
                      <select
                        value={selfForm.smokingStatus}
                        onChange={e => setSelfForm(prev => ({ ...prev, smokingStatus: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="Never">Never</option>
                        <option value="Former">Former Smoker</option>
                        <option value="Occasional">Occasional</option>
                        <option value="Regular">Regular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Physical Activity
                      </label>
                      <select
                        value={selfForm.physicalActivity}
                        onChange={e => setSelfForm(prev => ({ ...prev, physicalActivity: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="Sedentary">Sedentary (Desk job)</option>
                        <option value="Light (1-2 days/wk)">Light (1-2 days/wk)</option>
                        <option value="Moderate (3-5 days/wk)">Moderate (3-5 days/wk)</option>
                        <option value="Active (Daily)">Active (Daily workouts)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Nightly Sleep (Hours)
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="14"
                        step="0.5"
                        value={selfForm.sleepHours}
                        onChange={e => setSelfForm(prev => ({ ...prev, sleepHours: parseFloat(e.target.value) || 7 }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
                        Diet Preference
                      </label>
                      <select
                        value={selfForm.dietPreference}
                        onChange={e => setSelfForm(prev => ({ ...prev, dietPreference: e.target.value as any }))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Eggetarian">Eggetarian</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit & Generate Button */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setHealthReportViewMode('report')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel & Return to Passport
                  </button>

                  <button
                    type="submit"
                    disabled={isGeneratingSelfReport}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-300 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-xl shadow-teal-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingSelfReport ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
                        <span>Evaluating Clinical Health Parameters...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>✨ Generate Official Clinical Health Report (Evaluated by Site)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT 2: OFFICIAL HEALTH REPORT GENERATED BY THE SITE */}
            {healthReportViewMode === 'report' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Generated Health Score & Clinical Summary Card (if generatedSelfReport exists) */}
                {generatedSelfReport ? (
                  <div className="space-y-5">
                    {/* Top Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">Calculated Health Score</div>
                        <div className={`text-4xl font-black font-mono ${
                          generatedSelfReport.healthScore >= 85 ? 'text-emerald-400' : generatedSelfReport.healthScore >= 70 ? 'text-teal-400' : generatedSelfReport.healthScore >= 55 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {generatedSelfReport.healthScore} <span className="text-xs text-slate-500">/ 100</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Composite Physiological Index</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">Clinical Standing</div>
                        <div className="pt-2">
                          <span className={`px-3.5 py-1 rounded-full text-xs font-extrabold ${
                            generatedSelfReport.clinicalStatus === 'OPTIMAL'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : generatedSelfReport.clinicalStatus === 'MILD_ATTENTION'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : generatedSelfReport.clinicalStatus === 'MODERATE_RISK'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {generatedSelfReport.clinicalStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Evaluated by MedConnect Clinical Engine
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">Body Composition & BP</div>
                        <div className="text-sm font-bold text-white mt-1">
                          BMI {generatedSelfReport.metrics.bmi} ({generatedSelfReport.metrics.bmiCategory})
                        </div>
                        <div className="text-[10px] font-mono text-teal-400">
                          BP: {generatedSelfReport.metrics.bpCategory}
                        </div>
                      </div>
                    </div>

                    {/* Organ System Evaluations */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>Organ System Clinical Ratings (Analyzed by Site)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {generatedSelfReport.organSystemEvaluations.map((os, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{os.system}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                os.status === 'HEALTHY'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {os.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">{os.findings}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Executive Summary Box */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/20 space-y-2">
                      <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Site Clinical Executive Summary</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {generatedSelfReport.clinicalExecutiveSummary}
                      </p>
                    </div>

                    {/* Measured Vitals & Biomarkers Table */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                        Measured Vitals & Physiological Biomarkers:
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                            <tr>
                              <th className="p-3">Biomarker / Metric</th>
                              <th className="p-3">Measured Value</th>
                              <th className="p-3">Clinical Reference</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Clinical Finding</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono text-[11px]">
                            {generatedSelfReport.vitalBiomarkers.map((v, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/40 transition">
                                <td className="p-3 text-white font-sans font-bold">{v.parameter}</td>
                                <td className="p-3 font-bold text-white">
                                  {v.value} <span className="text-[10px] text-slate-400">{v.unit}</span>
                                </td>
                                <td className="p-3 text-slate-400">{v.reference}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                    v.status === 'NORMAL'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {v.status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-300 font-sans text-[11px]">{v.clinicalNote}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Directives Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Nutritional & Lifestyle Directives</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {generatedSelfReport.personalizedDirectives.nutrition.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                          {generatedSelfReport.personalizedDirectives.lifestyleAndSleep.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="text-[11px] font-mono text-teal-400 uppercase font-bold flex items-center space-x-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Physician Consultation Questions</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                          {generatedSelfReport.doctorDiscussionPoints.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Baseline Prompt Banner if not generated yet */
                  <div className="p-4 bg-teal-950/30 border border-teal-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white text-xs">Want to fill in your personal metrics by choice?</div>
                        <div className="text-[11px] text-slate-400">
                          Click "Fill / Customize My Details" to enter your BP, sugar, symptoms & vitals for an official site-evaluated report.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHealthReportViewMode('fill_details')}
                      className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-md transition"
                    >
                      Fill My Details →
                    </button>
                  </div>
                )}

                {/* Patient Demographics Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <span className="font-mono text-[10px] text-teal-400 uppercase font-bold">1. PATIENT DEMOGRAPHICS & IDENTIFICATION</span>
                    <button
                      type="button"
                      onClick={() => setHealthReportViewMode('fill_details')}
                      className="text-[10px] font-mono text-teal-400 hover:underline flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Full Name</div>
                      <div className="font-bold text-white text-sm">{currentPatient.fullName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">UHID Number</div>
                      <div className="font-mono font-bold text-teal-300">{currentPatient.uhid}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">ABHA Health ID</div>
                      <div className="font-mono text-slate-300">{currentPatient.abhaId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Age / Gender</div>
                      <div className="font-bold text-white">{currentPatient.age} Y ({currentPatient.gender})</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Blood Group</div>
                      <div className="font-bold text-rose-400">{currentPatient.bloodGroup}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Registered Phone</div>
                      <div className="font-mono text-slate-300">{currentPatient.phone}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Primary Facility</div>
                      <div className="text-slate-300">{currentPatient.hospital}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Attending Physician</div>
                      <div className="text-slate-300">{currentPatient.primaryDoctor}</div>
                    </div>
                  </div>
                </div>

                {/* Allergies & Chronic Conditions Alert Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                    <div className="text-[10px] font-mono text-rose-400 uppercase font-bold flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Recorded Drug Allergies</span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {currentPatient.allergies.join(', ') || 'No Known Drug Allergies (NKDA)'}
                    </div>
                    <div className="text-[10px] text-slate-400">Avoid prescribed substances without physician contraindication check.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                    <div className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Chronic Diagnoses & Conditions</span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {currentPatient.chronicConditions.join(', ') || 'No chronic health conditions documented'}
                    </div>
                    <div className="text-[10px] text-slate-400">Monitored in longitudinal EHR timeline.</div>
                  </div>
                </div>

                {/* Cumulative Medical Records Summary Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-teal-400 uppercase font-bold">
                      2. CUMULATIVE MEDICAL RECORDS ON FILE ({medicalRecords.length} ARCHIVED RECORDS)
                    </span>
                    <span className="text-[10px] text-slate-500">Complete Historical Repository</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Document Title</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Facility / Doctor</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono text-[11px]">
                        {medicalRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-2.5 text-slate-400 whitespace-nowrap">{r.date}</td>
                            <td className="p-2.5 text-white font-sans font-bold">{r.title}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-teal-300">
                                {r.category}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300 font-sans">{r.doctor} ({r.hospital})</td>
                            <td className="p-2.5 text-emerald-400 font-bold">{r.status || 'VERIFIED'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Verification Watermark */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>Digitally Authenticated by MedConnect National Health Stack CMIO</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    KEY: SHA256-{currentPatient.uhid.replace(/-/g, '')}-SECURE-STAMP
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setHealthReportViewMode('fill_details')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 transition text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit My Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Report</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDownloadConsolidatedHealthReport}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-teal-500/25 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Download Official Report (.txt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHealthReportModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

