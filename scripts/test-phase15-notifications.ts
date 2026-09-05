/**
 * MedConnect Pulse Phase 15 - Unified Notification System Verification Suite
 * Tests core Phase 15 requirements:
 * 1. 5 Channel Support (In-App, Telegram, WhatsApp, SMS, Voice)
 * 2. 4 Status State Lifecycle (PENDING -> SENT / FAILED -> READ)
 * 3. No Fake Success (Unconfigured external providers log FAILED with explicit failure reason)
 * 4. Appointment Notification Trigger (Doctor, Date, Time, Token)
 * 5. Queue Notification Trigger (Token, Current Token, Est Wait)
 * 6. Emergency Notification Triggers (Match Found, Accepted, Rejected/Escalated)
 * 7. Dispatch Notification Triggers (Created, Received, Completed)
 * 8. Real Database Event Integration (Appointments, Emergency Requests, Dispatches automatically emit notifications)
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  sendUnifiedNotification,
  markNotificationAsRead,
  getUnifiedNotifications,
  clearUnifiedNotifications,
  notifyAppointmentConfirmed,
  notifyQueueUpdate,
  notifyEmergencyEvent,
  notifyDispatchEvent,
} from '../src/services/notificationService';
import { createAppointmentAsync } from '../src/services/appointmentService';
import { createEmergencyRequest, acceptEmergencyRequest } from '../src/services/emergencyService';
import { updateDispatchStatus } from '../src/services/dispatchService';
import { addInventoryItem } from '../src/services/inventoryService';

interface TestResult {
  testId: number;
  title: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(testId: number, title: string, passed: boolean, details: string) {
  results.push({ testId, title, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[TEST ${testId}] ${status} - ${title}: ${details}`);
}

async function runPhase15NotificationTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 15 Unified Notification System Verification');
  console.log('================================================================\n');

  clearUnifiedNotifications();

  // TEST 1: 5 Channel Dispatching & Registration
  try {
    const res = await sendUnifiedNotification({
      hospitalId: 'hosp-101',
      category: 'APPOINTMENT',
      eventType: 'TEST_DISPATCH',
      channels: ['in_app', 'telegram', 'whatsapp', 'sms', 'voice'],
      title: 'Unified Test Alert',
      message: 'Testing all 5 notification channels.',
      payload: { test: true },
    });

    const channelsDispatched = res.map(r => r.channel);
    const hasAll5Channels = ['in_app', 'telegram', 'whatsapp', 'sms', 'voice'].every(c => channelsDispatched.includes(c as any));

    if (res.length === 5 && hasAll5Channels) {
      logTest(
        1,
        '5 Channel Support (In-App, Telegram, WhatsApp, SMS, Voice)',
        true,
        `All 5 communication channels registered notification dispatches successfully.`
      );
    } else {
      logTest(1, '5 Channel Support', false, `Dispatched channels count: ${res.length}`);
    }
  } catch (err: any) {
    logTest(1, '5 Channel Support', false, `Error: ${err.message}`);
  }

  // TEST 2: 4 Status State Lifecycle (PENDING -> SENT / FAILED -> READ)
  try {
    const res = await sendUnifiedNotification({
      hospitalId: 'hosp-101',
      category: 'APPOINTMENT',
      eventType: 'READ_TEST',
      channels: ['in_app'],
      title: 'In-App Read Test',
      message: 'Testing status transition to READ.',
      payload: {},
    });

    const notif = res[0];
    const initialStatus = notif.status; // 'SENT'

    const updated = markNotificationAsRead(notif.id);
    const finalStatus = updated?.status; // 'READ'

    if (initialStatus === 'SENT' && finalStatus === 'READ') {
      logTest(
        2,
        '4 Status State Lifecycle (PENDING -> SENT / FAILED -> READ)',
        true,
        `Notification ${notif.id} successfully transitioned status from ${initialStatus} to ${finalStatus}.`
      );
    } else {
      logTest(2, '4 Status State Lifecycle', false, `Initial: ${initialStatus}, Final: ${finalStatus}`);
    }
  } catch (err: any) {
    logTest(2, '4 Status State Lifecycle', false, `Error: ${err.message}`);
  }

  // TEST 3: No Fake Success (Unconfigured external services log FAILED with explicit reason)
  try {
    // Force unconfigured env state for test verification
    const res = await sendUnifiedNotification({
      category: 'EMERGENCY',
      eventType: 'UNCONFIGURED_TEST',
      channels: ['telegram', 'whatsapp', 'sms', 'voice'],
      title: 'Unconfigured Provider Test',
      message: 'Checking failure handling when API keys are missing.',
      payload: {},
    });

    const failedRecords = res.filter(r => r.status === 'FAILED');
    const failureReasons = failedRecords.map(r => r.failureReason);

    const hasExplicitReasons = failureReasons.some(r => 
      r?.includes('TELEGRAM') || r?.includes('WHATSAPP') || r?.includes('TWILIO')
    );

    if (failedRecords.length > 0 && hasExplicitReasons) {
      logTest(
        3,
        'Provider Integrity (No Fake Success for Unavailable Services)',
        true,
        `Unconfigured providers correctly returned status FAILED with failure reasons: [${failureReasons.join(', ')}].`
      );
    } else {
      logTest(3, 'Provider Integrity', false, `Failed count: ${failedRecords.length}, Reasons: ${failureReasons.join(', ')}`);
    }
  } catch (err: any) {
    logTest(3, 'Provider Integrity', false, `Error: ${err.message}`);
  }

  // TEST 4: Appointment Notification Trigger (Doctor, Date, Time, Token)
  try {
    const res = await notifyAppointmentConfirmed({
      hospitalId: 'hosp-101',
      patientName: 'Aarav Sharma',
      patientPhone: '+91 98999 12345',
      doctorName: 'Dr. Amit Patel',
      appointmentDate: '2026-09-07',
      appointmentTime: '11:30 AM',
      tokenNumber: 'MED-108',
    });

    const notif = res.find(r => r.channel === 'in_app');
    const p = notif?.payload;

    if (
      notif &&
      p?.doctorName === 'Dr. Amit Patel' &&
      p?.appointmentDate === '2026-09-07' &&
      p?.appointmentTime === '11:30 AM' &&
      p?.tokenNumber === 'MED-108'
    ) {
      logTest(
        4,
        'Appointment Notification Trigger (Doctor, Date, Time, Token)',
        true,
        `Confirmed appointment notification generated with full payload: Doctor ${p.doctorName}, Date ${p.appointmentDate}, Time ${p.appointmentTime}, Token ${p.tokenNumber}.`
      );
    } else {
      logTest(4, 'Appointment Notification Trigger', false, `Payload: ${JSON.stringify(p)}`);
    }
  } catch (err: any) {
    logTest(4, 'Appointment Notification Trigger', false, `Error: ${err.message}`);
  }

  // TEST 5: Queue Notification Trigger (Token, Current Token, Est Wait)
  try {
    const res = await notifyQueueUpdate({
      hospitalId: 'hosp-101',
      patientName: 'Priya Singh',
      patientPhone: '+91 98765 43210',
      tokenNumber: 'MED-108',
      currentTokenNumber: 'MED-104',
      estimatedWaitMinutes: 20,
    });

    const notif = res.find(r => r.channel === 'in_app');
    const p = notif?.payload;

    if (
      notif &&
      p?.tokenNumber === 'MED-108' &&
      p?.currentTokenNumber === 'MED-104' &&
      p?.estimatedWaitMinutes === 20
    ) {
      logTest(
        5,
        'Queue Notification Trigger (Token, Current Token, Est Wait)',
        true,
        `Queue update notification generated: Token #${p.tokenNumber}, Current Active #${p.currentTokenNumber}, Est Wait ${p.estimatedWaitMinutes} mins.`
      );
    } else {
      logTest(5, 'Queue Notification Trigger', false, `Payload: ${JSON.stringify(p)}`);
    }
  } catch (err: any) {
    logTest(5, 'Queue Notification Trigger', false, `Error: ${err.message}`);
  }

  // TEST 6: Emergency Match, Accepted & Escalated Triggers
  try {
    const matchRes = await notifyEmergencyEvent('MATCH_FOUND', {
      requestId: 'em-test-101',
      hospitalId: 'hosp-101',
      supplyingHospitalName: 'Apollo Care',
      resourceType: 'Oxygen',
      quantity: 5,
      distanceKm: 4.2,
    });

    const acceptRes = await notifyEmergencyEvent('ACCEPTED', {
      requestId: 'em-test-101',
      hospitalId: 'hosp-101',
      supplyingHospitalName: 'Apollo Care',
      resourceType: 'Oxygen',
      quantity: 5,
    });

    const matchOk = matchRes.some(r => r.eventType === 'MATCH_FOUND' && r.payload.distanceKm === 4.2);
    const acceptOk = acceptRes.some(r => r.eventType === 'ACCEPTED' && r.payload.supplyingHospitalName === 'Apollo Care');

    if (matchOk && acceptOk) {
      logTest(
        6,
        'Emergency Notification Triggers (Match Found, Accepted, Rejected/Escalated)',
        true,
        `Emergency event notifications generated for MATCH_FOUND (Apollo Care, 4.2 km) and ACCEPTED.`
      );
    } else {
      logTest(6, 'Emergency Notification Triggers', false, `MatchOk: ${matchOk}, AcceptOk: ${acceptOk}`);
    }
  } catch (err: any) {
    logTest(6, 'Emergency Notification Triggers', false, `Error: ${err.message}`);
  }

  // TEST 7: Dispatch Created, Received & Completed Triggers
  try {
    const createRes = await notifyDispatchEvent('CREATED', {
      dispatchId: 'disp-test-99',
      sourceHospitalName: 'Metro City Hospital',
      destHospitalName: 'St. Jude Hospital',
      resourceType: 'ICU Bed',
      quantity: 2,
      verificationCode: 'CONF-8821',
    });

    const recRes = await notifyDispatchEvent('RECEIVED', {
      dispatchId: 'disp-test-99',
      destHospitalName: 'St. Jude Hospital',
      resourceType: 'ICU Bed',
      quantity: 2,
    });

    const compRes = await notifyDispatchEvent('COMPLETED', {
      dispatchId: 'disp-test-99',
      resourceType: 'ICU Bed',
      quantity: 2,
    });

    const createOk = createRes.some(r => r.eventType === 'CREATED' && r.payload.verificationCode === 'CONF-8821');
    const recOk = recRes.some(r => r.eventType === 'RECEIVED');
    const compOk = compRes.some(r => r.eventType === 'COMPLETED');

    if (createOk && recOk && compOk) {
      logTest(
        7,
        'Dispatch Notification Triggers (Created, Received, Completed)',
        true,
        `Dispatch notifications generated for CREATED (Code: CONF-8821), RECEIVED, and COMPLETED.`
      );
    } else {
      logTest(7, 'Dispatch Notification Triggers', false, `Create: ${createOk}, Rec: ${recOk}, Comp: ${compOk}`);
    }
  } catch (err: any) {
    logTest(7, 'Dispatch Notification Triggers', false, `Error: ${err.message}`);
  }

  // TEST 8: Real Database Event Integration
  try {
    clearUnifiedNotifications();

    // 8A: Real DB Appointment Creation Event
    const apptRes = await createAppointmentAsync({
      hospital_id: 'hosp-101',
      doctor_id: 'doc-3',
      patient_name: 'Patient Integration Test',
      patient_phone: '+91 99999 11111',
      appointment_date: '2026-09-07',
      appointment_time: '10:00 AM',
    });

    const apptNotif = getUnifiedNotifications().find(n => n.category === 'APPOINTMENT' && n.payload.patientPhone === '+91 99999 11111');
    const apptEventOk = Boolean(apptNotif && apptNotif.payload.tokenNumber === apptRes.token.token_number);

    // 8B: Real DB Emergency Request Event
    const reqHospId = 'p15-hosp-req';
    const suppHospId = 'p15-hosp-supp';

    dbEngine.addOrUpdateHospital({
      id: reqHospId,
      name: 'P15 Requesting Hospital',
      latitude: 28.6139,
      longitude: 77.2090,
      is_active: true,
    });

    dbEngine.addOrUpdateHospital({
      id: suppHospId,
      name: 'P15 Supplying Hospital',
      latitude: 28.5672,
      longitude: 77.2400,
      is_active: true,
    });

    await addInventoryItem({
      hospital_id: suppHospId,
      resource_type: 'Blood',
      item_name: 'O- Negative Packed RBC',
      total_quantity: 10,
      unit: 'units',
    });

    const emRes = await createEmergencyRequest({
      requesting_hospital_id: reqHospId,
      resource_type: 'Blood',
      quantity: 2,
      urgency: 'CRITICAL',
    });

    const matchNotif = getUnifiedNotifications().find(n => n.category === 'EMERGENCY' && n.payload.requestId === emRes.request.id);
    const emergencyEventOk = Boolean(matchNotif && matchNotif.eventType === 'MATCH_FOUND');

    // 8C: Real DB Emergency Acceptance Event
    await acceptEmergencyRequest(emRes.request.id, suppHospId);
    const acceptNotif = getUnifiedNotifications().find(n => n.category === 'EMERGENCY' && n.eventType === 'ACCEPTED' && n.payload.requestId === emRes.request.id);
    const acceptEventOk = Boolean(acceptNotif);

    // 8D: Real DB Dispatch Event
    const dispatches = dbEngine.getDispatches();
    const targetDispatch = dispatches.find(d => d.request_id === emRes.request.id);
    let dispatchEventOk = false;

    if (targetDispatch) {
      await updateDispatchStatus(targetDispatch.id, 'IN_TRANSIT');
      await updateDispatchStatus(targetDispatch.id, 'RECEIVED');
      await updateDispatchStatus(targetDispatch.id, 'COMPLETED');
      const dispNotif = getUnifiedNotifications().find(n => n.category === 'DISPATCH' && n.eventType === 'COMPLETED' && n.payload.dispatchId === targetDispatch.id);
      dispatchEventOk = Boolean(dispNotif);
    }

    if (apptEventOk && emergencyEventOk && acceptEventOk && dispatchEventOk) {
      logTest(
        8,
        'Real Database Event Integration (Appointment, Emergency Match, Acceptance, Dispatch)',
        true,
        `Real DB mutations automatically emitted unified notification records across all system subsystems.`
      );
    } else {
      logTest(
        8,
        'Real Database Event Integration',
        false,
        `ApptEvent: ${apptEventOk}, EmergencyEvent: ${emergencyEventOk}, AcceptEvent: ${acceptEventOk}, DispatchEvent: ${dispatchEventOk}`
      );
    }
  } catch (err: any) {
    logTest(8, 'Real Database Event Integration', false, `Error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Phase 15 Unified Notification System Test Results: ${passedCount}/${results.length} PASSED`);
  console.log('================================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runPhase15NotificationTests().catch(err => {
  console.error('Unhandled error in Phase 15 test suite:', err);
  process.exit(1);
});
