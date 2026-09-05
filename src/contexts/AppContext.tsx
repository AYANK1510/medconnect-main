import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  UserRole,
  Hospital,
  Doctor,
  Appointment,
  QueueToken,
  EmergencyRequest,
  DispatchPass,
  InventoryItem,
  N8nWorkflow,
  ActivityLog,
  SystemServiceHealth,
} from '../types';
import {
  INITIAL_HOSPITALS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_QUEUE_TOKENS,
  INITIAL_EMERGENCY_REQUESTS,
  INITIAL_DISPATCHES,
  INITIAL_INVENTORY,
  INITIAL_N8N_WORKFLOWS,
  INITIAL_ACTIVITY_LOGS,
} from '../data/mockData';
import { dbEngine } from '../lib/dbEngine';
import { filterHospitalsWithinRadius } from '../services/geoService';
import { generateQRCodeDataUrl } from '../services/qrService';
import { sendTelegramEmergencyAlert } from '../services/telegramService';
import { initiateTwilioVoiceCall } from '../services/twilioService';
import confetti from 'canvas-confetti';

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

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'emergency';
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  pitchMode: boolean;
  setPitchMode: (val: boolean) => void;
  
  hospitals: Hospital[];
  doctors: Doctor[];
  appointments: Appointment[];
  queueTokens: QueueToken[];
  emergencyRequests: EmergencyRequest[];
  dispatches: DispatchPass[];
  inventory: InventoryItem[];
  workflows: N8nWorkflow[];
  activityLogs: ActivityLog[];
  systemHealth: SystemServiceHealth;

  toasts: Toast[];
  addToast: (title: string, message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Actions
  bookAppointment: (details: {
    patientName: string;
    patientPhone: string;
    hospitalId: string;
    department: string;
    doctorId: string;
    doctorName: string;
    date: string;
    timeSlot: string;
    source?: Appointment['source'];
  }) => Promise<Appointment>;

  createEmergencyRequest: (details: {
    requestingHospitalId: string;
    type: 'blood' | 'oxygen' | 'icu_bed';
    bloodGroup?: any;
    quantity: number;
    urgency: 'critical' | 'high' | 'normal';
  }) => Promise<EmergencyRequest>;

  acceptEmergencyRequest: (requestId: string, acceptingHospitalId: string) => Promise<void>;
  simulateThreeMinuteTimeout: (requestId: string) => Promise<void>;
  advanceQueue: () => void;
  
  // Quick Demo Triggers for Judges
  runDemoScenario: (scenarioId: number) => Promise<void>;

  // Voice AI Widget state
  aiWidgetOpen: boolean;
  setAiWidgetOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('patient');
  const [activePage, setActivePage] = useState<ActivePage>('landing');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [pitchMode, setPitchMode] = useState<boolean>(false);

  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>(INITIAL_QUEUE_TOKENS);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>(INITIAL_EMERGENCY_REQUESTS);
  const [dispatches, setDispatches] = useState<DispatchPass[]>(INITIAL_DISPATCHES);
  const [inventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [workflows] = useState<N8nWorkflow[]>(INITIAL_N8N_WORKFLOWS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [aiWidgetOpen, setAiWidgetOpen] = useState<boolean>(false);

  const systemHealth: SystemServiceHealth = {
    n8n: true,
    supabase: true,
    sarvamAi: true,
    openAi: true,
    telegram: true,
    twilio: true,
  };

  const addToast = (title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    addToast('Role Switched', `Now viewing MedConnect Pulse as ${newRole.toUpperCase()}`, 'info');
    if (newRole === 'patient') setActivePage('patient');
    else if (newRole === 'reception') setActivePage('reception');
    else if (newRole === 'er_staff') setActivePage('er_command');
    else if (newRole === 'admin') setActivePage('analytics');
  };

  const addActivityLog = (
    title: string,
    description: string,
    category: ActivityLog['category'] = 'system',
    severity: ActivityLog['severity'] = 'info'
  ) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      title,
      description,
      category,
      severity,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Appointment Booking Logic
  const bookAppointment = async (details: {
    patientName: string;
    patientPhone: string;
    hospitalId: string;
    department: string;
    doctorId: string;
    doctorName: string;
    date: string;
    timeSlot: string;
    source?: Appointment['source'];
  }): Promise<Appointment> => {
    const hosp = hospitals.find((h) => h.id === details.hospitalId) || hospitals[0];
    const nextTokenNum = 4030 + appointments.length;
    const token = `#MED-${nextTokenNum}`;

    const existingInDept = queueTokens.filter((q) => q.department === details.department && q.status === 'waiting');
    const queuePosition = existingInDept.length + 2;
    const estimatedWaitMinutes = queuePosition * 4;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      token,
      patientName: details.patientName,
      patientPhone: details.patientPhone,
      hospitalId: details.hospitalId,
      hospitalName: hosp.name,
      department: details.department,
      doctorId: details.doctorId,
      doctorName: details.doctorName,
      date: details.date,
      timeSlot: details.timeSlot,
      status: 'confirmed',
      queuePosition,
      estimatedWaitMinutes,
      source: details.source || 'web_ui',
      createdAt: new Date().toISOString(),
    };

    const newQToken: QueueToken = {
      id: `q-${Date.now()}`,
      token,
      patientName: details.patientName,
      patientPhone: details.patientPhone,
      department: details.department,
      doctorName: details.doctorName,
      position: queuePosition,
      status: 'waiting',
      estimatedWaitMinutes,
      checkedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAppointments((prev) => [newApt, ...prev]);
    setQueueTokens((prev) => [...prev, newQToken]);

    addActivityLog(
      `Appointment ${token} Booked`,
      `Patient ${details.patientName} booked with ${details.doctorName} (${details.department}). Source: ${newApt.source.toUpperCase()}.`,
      'appointment',
      'success'
    );

    addToast('Booking Confirmed! ✓', `Token ${token} assigned. Est. wait time: ${estimatedWaitMinutes} mins.`, 'success');
    return newApt;
  };

  // Emergency SOS Request Creation & 15km Geo-Fence Filter
  const createEmergencyRequest = async (details: {
    requestingHospitalId: string;
    type: 'blood' | 'oxygen' | 'icu_bed';
    bloodGroup?: any;
    quantity: number;
    urgency: 'critical' | 'high' | 'normal';
  }): Promise<EmergencyRequest> => {
    const reqHospital = hospitals.find((h) => h.id === details.requestingHospitalId) || hospitals[0];
    const reqNum = `#REQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const nearbyHospitals = filterHospitalsWithinRadius(reqHospital.lat, reqHospital.lng, hospitals, 15.0);

    const newReq: EmergencyRequest = {
      id: `req-${Date.now()}`,
      reqNumber: reqNum,
      requestingHospitalId: reqHospital.id,
      requestingHospitalName: reqHospital.name,
      type: details.type,
      bloodGroup: details.bloodGroup,
      quantity: details.quantity,
      urgency: details.urgency,
      requestingLat: reqHospital.lat,
      requestingLng: reqHospital.lng,
      status: 'broadcasted',
      createdAt: new Date().toISOString(),
      timerSecondsRemaining: 180,
      matchedHospitalsCount: nearbyHospitals.length,
    };

    setEmergencyRequests((prev) => [newReq, ...prev]);

    addActivityLog(
      `SOS Broadcast ${reqNum} Created`,
      `${reqHospital.name} requested ${details.quantity} ${details.bloodGroup ? details.bloodGroup + ' Blood' : details.type.toUpperCase()} (${details.urgency.toUpperCase()}).`,
      'emergency',
      'emergency'
    );

    const primarySupplyingHosp = nearbyHospitals[1] || nearbyHospitals[0] || hospitals[1] || hospitals[0];
    const dbSuppHospId = primarySupplyingHosp.id === 'hosp-2' ? 'hosp-102' : (primarySupplyingHosp.id === 'hosp-3' ? 'hosp-103' : 'hosp-102');
    const resName = details.bloodGroup ? `${details.bloodGroup} Blood` : details.type.toUpperCase();

    // Register in dbEngine so Telegram callback query can find match & atomic reservation succeeds
    try {
      const inv = dbEngine.getInventory(dbSuppHospId);
      const hasItem = inv.some(i => i.resource_type.toLowerCase() === details.type.toLowerCase());
      if (!hasItem) {
        dbEngine.addInventoryItem({
          hospital_id: dbSuppHospId,
          resource_type: details.type,
          item_name: resName,
          total_quantity: Math.max(details.quantity * 3, 20),
          unit: details.type === 'blood' ? 'units' : 'cylinders',
        });
      }

      const dbRes = dbEngine.createEmergencyRequest({
        requesting_hospital_id: reqHospital.id === 'hosp-1' ? 'hosp-101' : reqHospital.id,
        resource_type: details.type,
        resource_name: resName,
        quantity: details.quantity,
        urgency: details.urgency.toUpperCase() as any,
        notes: `Emergency SOS: ${reqNum}`,
      });
      (dbRes.request as any).reqNumber = reqNum;
      (dbRes.request as any).appRequestId = newReq.id;

      if (!dbEngine.getEmergencyMatches().some(m => m.request_id === dbRes.request.id && m.hospital_id === dbSuppHospId)) {
        dbEngine.addEmergencyMatch({
          id: `em-match-${Date.now()}-${dbSuppHospId}`,
          request_id: dbRes.request.id,
          hospital_id: dbSuppHospId,
          distance_km: primarySupplyingHosp.distanceKm || 4.2,
          status: 'PENDING',
          notified_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // Send Telegram alert with real request ID and supplying hospital ID
      await sendTelegramEmergencyAlert({
        requestId: dbRes.request.id,
        reqNumber: reqNum,
        supplyingHospitalId: dbSuppHospId,
        emergencyHospital: reqHospital.name,
        requestingHospitalName: reqHospital.name,
        resource: resName,
        resourceType: details.type,
        bloodGroup: details.bloodGroup,
        quantity: details.quantity,
        distanceKm: primarySupplyingHosp.distanceKm || 4.2,
        etaMinutes: Math.round((primarySupplyingHosp.distanceKm || 4.2) * 1.8),
        urgency: details.urgency.toUpperCase(),
      });
    } catch (dbErr) {
      console.warn('[AppContext] dbEngine sync notice:', dbErr);
      await sendTelegramEmergencyAlert({
        requestId: newReq.id,
        reqNumber: reqNum,
        supplyingHospitalId: dbSuppHospId,
        emergencyHospital: reqHospital.name,
        requestingHospitalName: reqHospital.name,
        resource: resName,
        resourceType: details.type,
        bloodGroup: details.bloodGroup,
        quantity: details.quantity,
        distanceKm: primarySupplyingHosp.distanceKm || 4.2,
        etaMinutes: Math.round((primarySupplyingHosp.distanceKm || 4.2) * 1.8),
        urgency: details.urgency.toUpperCase(),
      });
    }

    addActivityLog(
      `15 KM Geo-Fence Telegram Alerts Dispatched`,
      `Dispatched emergency Telegram alerts to ${nearbyHospitals.length} hospitals within 15km. Escalation timer: 3m 00s.`,
      'emergency',
      'warning'
    );

    addToast(
      'Emergency SOS Broadcasted 🚨',
      `Sent Telegram alerts to ${nearbyHospitals.length} hospitals within 15 km radius.`,
      'emergency'
    );

    return newReq;
  };

  // Accept Emergency Request & Lock Inventory
  const acceptEmergencyRequest = async (requestId: string, acceptingHospitalId: string) => {
    const req = emergencyRequests.find((r) => r.id === requestId);
    if (!req) return;

    const acceptingHosp = hospitals.find((h) => h.id === acceptingHospitalId) || hospitals[2]; // Metro Hospital
    const qrPassCode = `MEDPULSE-PASS-${req.reqNumber.replace('#REQ-', '')}-${acceptingHosp.code}-${req.requestingHospitalId.toUpperCase()}`;
    const qrDataUrl = await generateQRCodeDataUrl(qrPassCode);

    // Update Request status
    setEmergencyRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'accepted',
              acceptedByHospitalId: acceptingHosp.id,
              acceptedByHospitalName: acceptingHosp.name,
              distanceToAcceptedKm: 6.8,
              timerSecondsRemaining: 0,
              qrPassCode,
            }
          : r
      )
    );

    // Create Dispatch Pass
    const newDispatch: DispatchPass = {
      id: `disp-${Date.now()}`,
      requestId: req.id,
      reqNumber: req.reqNumber,
      sendingHospitalName: acceptingHosp.name,
      receivingHospitalName: req.requestingHospitalName,
      resourceType: req.type,
      quantity: req.quantity,
      bloodGroup: req.bloodGroup,
      etaMinutes: 12,
      qrCodeData: qrDataUrl,
      timestamp: new Date().toISOString(),
      status: 'in_transit',
    };

    setDispatches((prev) => [newDispatch, ...prev]);

    // Lock Inventory in accepting hospital
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === acceptingHosp.id) {
          if (req.type === 'blood' && req.bloodGroup) {
            const currentGroup = h.bloodInventory[req.bloodGroup] || 0;
            return {
              ...h,
              bloodInventory: {
                ...h.bloodInventory,
                [req.bloodGroup]: Math.max(0, currentGroup - req.quantity),
              },
            };
          } else if (req.type === 'oxygen') {
            return {
              ...h,
              oxygenUnitsAvailable: Math.max(0, h.oxygenUnitsAvailable - req.quantity),
            };
          } else if (req.type === 'icu_bed') {
            return {
              ...h,
              icuBedsAvailable: Math.max(0, h.icuBedsAvailable - req.quantity),
            };
          }
        }
        return h;
      })
    );

    // Trigger celebration effect
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    addActivityLog(
      `Emergency Request ${req.reqNumber} Accepted ✓`,
      `${acceptingHosp.name} accepted & locked ${req.quantity} ${req.bloodGroup ? req.bloodGroup : req.type}. QR Dispatch Pass generated!`,
      'emergency',
      'success'
    );

    addToast(
      'Request Accepted & Inventory Locked! ✓',
      `${acceptingHosp.name} has reserved ${req.quantity} units. Dispatch pass ready.`,
      'success'
    );
  };

  // Decline Emergency Request from Telegram or ER Staff
  const declineEmergencyRequest = (requestId: string) => {
    setEmergencyRequests((prev) =>
      prev.map((r) =>
        r.id === requestId || r.reqNumber === requestId
          ? { ...r, status: 'cancelled' }
          : r
      )
    );
    addActivityLog(
      `Emergency Request Declined`,
      `Supplying facility declined request ${requestId}. Escalating to next nearest hospital.`,
      'emergency',
      'warning'
    );
  };

  // Real-time Telegram Bot Callback Event Listener
  useEffect(() => {
    const handleAccepted = (e: any) => {
      const detail = e.detail;
      const targetReqId = detail?.rawRequestId || detail?.requestId;
      const targetHospId = detail?.hospitalId || 'hosp-3';

      setEmergencyRequests((prev) => {
        const found = prev.find((r) => r.id === targetReqId || r.reqNumber === targetReqId || r.status === 'broadcasted');
        if (found && found.status !== 'accepted') {
          setTimeout(() => {
            acceptEmergencyRequest(found.id, targetHospId);
          }, 50);
        }
        return prev;
      });
    };

    const handleDeclined = (e: any) => {
      const detail = e.detail;
      const targetReqId = detail?.rawRequestId || detail?.requestId;
      setEmergencyRequests((prev) => {
        const found = prev.find((r) => r.id === targetReqId || r.reqNumber === targetReqId || r.status === 'broadcasted');
        if (found && found.status !== 'cancelled') {
          declineEmergencyRequest(found.id);
        }
        return prev;
      });
    };

    window.addEventListener('medconnect:emergency_accepted', handleAccepted);
    window.addEventListener('medconnect:emergency_declined', handleDeclined);

    return () => {
      window.removeEventListener('medconnect:emergency_accepted', handleAccepted);
      window.removeEventListener('medconnect:emergency_declined', handleDeclined);
    };
  }, []);

  // Simulate 3-Minute Timeout & Twilio Voice Fallback Escalation
  const simulateThreeMinuteTimeout = async (requestId: string) => {
    const req = emergencyRequests.find((r) => r.id === requestId);
    if (!req) return;

    setEmergencyRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'esc_twilio', timerSecondsRemaining: 0 } : r))
    );

    addActivityLog(
      `3-Min Timeout: Telegram Alert Unanswered`,
      `Response window expired for ${req.reqNumber}. Initiating automated Twilio Voice Escalation Call to Regional Coordinator.`,
      'emergency',
      'warning'
    );

    await initiateTwilioVoiceCall({
      reqNumber: req.reqNumber,
      requestingHospitalName: req.requestingHospitalName,
      resourceType: req.type,
      quantity: req.quantity,
      bloodGroup: req.bloodGroup,
    });

    addActivityLog(
      `Twilio Voice Call Placed 📞`,
      `Automated priority voice escalation call connected with Chief Regional Medical Officer.`,
      'system',
      'emergency'
    );

    addToast(
      'Twilio Voice Call Triggered 📞',
      `Telegram timeout reached. Regional Emergency Officer contacted directly via phone.`,
      'warning'
    );
  };

  // Advance Live Queue
  const advanceQueue = () => {
    setQueueTokens((prev) => {
      const servingIdx = prev.findIndex((q) => q.status === 'serving');
      if (servingIdx !== -1) {
        const updated = [...prev];
        updated[servingIdx].status = 'completed';
        const nextIdx = updated.findIndex((q) => q.status === 'waiting');
        if (nextIdx !== -1) {
          updated[nextIdx].status = 'serving';
          updated[nextIdx].estimatedWaitMinutes = 0;
        }
        // Recalculate remaining wait times & positions
        let pos = 1;
        return updated.map((q) => {
          if (q.status === 'waiting') {
            const newWait = Math.max(0, (pos - 1) * 4);
            const res = { ...q, position: pos, estimatedWaitMinutes: newWait };
            pos++;
            return res;
          }
          return q;
        });
      }
      return prev;
    });

    addActivityLog(
      'Live Queue Advanced',
      'Token completed consultation. Next patient called. Queue recalculated via n8n engine.',
      'appointment',
      'info'
    );

    addToast('Queue Advanced', 'Next patient token called to consultation room.', 'info');
  };

  // Fast Hackathon Demo Scenarios for Judges
  const runDemoScenario = async (scenarioId: number) => {
    switch (scenarioId) {
      case 1: // Book Appointment
        await bookAppointment({
          patientName: 'Judge / Demo User',
          patientPhone: '+91 98000 11111',
          hospitalId: 'hosp-1',
          department: 'Cardiology',
          doctorId: 'doc-1',
          doctorName: 'Dr. Rajesh Sharma',
          date: '2026-09-04',
          timeSlot: '11:30 AM',
          source: 'web_ui',
        });
        setActivePage('patient');
        break;

      case 2: // Simulate Voice AI Request
        setAiWidgetOpen(true);
        setActivePage('ai_receptionist');
        break;

      case 3: // Emergency Oxygen Request
        {
          await createEmergencyRequest({
            requestingHospitalId: 'hosp-1',
            type: 'oxygen',
            quantity: 15,
            urgency: 'critical',
          });
          setActivePage('er_command');
        }
        break;

      case 4: // Emergency Blood Request
        {
          await createEmergencyRequest({
            requestingHospitalId: 'hosp-1',
            type: 'blood',
            bloodGroup: 'O-',
            quantity: 4,
            urgency: 'critical',
          });
          setActivePage('er_command');
        }
        break;

      case 5: // Hospital Accepts Request
        {
          const latestReq = emergencyRequests.find((r) => r.status === 'broadcasted') || emergencyRequests[0];
          if (latestReq) {
            await acceptEmergencyRequest(latestReq.id, 'hosp-3');
            setActivePage('emergency_dispatch');
          }
        }
        break;

      case 6: // Simulate 3-Minute Timeout
        {
          const latestReq = emergencyRequests.find((r) => r.status === 'broadcasted') || emergencyRequests[0];
          if (latestReq) {
            await simulateThreeMinuteTimeout(latestReq.id);
            setActivePage('er_command');
          }
        }
        break;

      case 7: // Generate QR Pass
        setActivePage('emergency_dispatch');
        addToast('QR Pass Displayed', 'Viewing active secure QR dispatch pass.', 'info');
        break;

      case 8: // Simulate Twilio Escalation
        {
          const latestReq = emergencyRequests[0];
          if (latestReq) {
            await simulateThreeMinuteTimeout(latestReq.id);
            setActivePage('er_command');
          }
        }
        break;

      default:
        break;
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        activePage,
        setActivePage,
        demoMode,
        setDemoMode,
        pitchMode,
        setPitchMode,
        hospitals,
        doctors,
        appointments,
        queueTokens,
        emergencyRequests,
        dispatches,
        inventory,
        workflows,
        activityLogs,
        systemHealth,
        toasts,
        addToast,
        removeToast,
        bookAppointment,
        createEmergencyRequest,
        acceptEmergencyRequest,
        simulateThreeMinuteTimeout,
        advanceQueue,
        runDemoScenario,
        aiWidgetOpen,
        setAiWidgetOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
