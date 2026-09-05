/**
 * MedConnect Pulse Phase 6 - Live Queue System Verification Suite
 * Tests core Phase 6 requirements:
 * 1. Queue tokens creation & initial database state
 * 2. Patient metrics calculation (My Token, Current Token, Position, People Ahead, Est. Wait Time, Status)
 * 3. Reception Check-In action
 * 4. Reception Call Next Patient action (Updates current token & patient metrics)
 * 5. Reception Complete action (Auto-advances queue)
 * 6. Reception Skip / No-Show action
 * 7. Database event → Realtime subscriber notification → Patient UI state update
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  createAppointment,
  calculateAvailableSlots
} from '../src/services/appointmentService';
import {
  fetchQueueTokens,
  updateQueueStatus,
  callNextPatient,
  getPatientQueueMetrics,
  subscribeToQueueUpdates
} from '../src/services/queueService';

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

async function runPhase6LiveQueueTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 6 Live Queue Verification');
  console.log('================================================================\n');

  const testHospitalId = 'hosp-101';
  let createdDoctorId = '';
  let createdDeptId = '';
  const testDate = '2026-09-09'; // Future Wednesday

  // Setup: Create Doctor (15 min slot)
  try {
    const dept = dbEngine.createDepartment(testHospitalId, 'Neurology OPD', 'Brain & Spine Unit');
    createdDeptId = dept.id;

    const doc = dbEngine.createDoctor({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      name: 'Dr. Siddharth Verma',
      specialization: 'Neurologist',
      consultation_fee: 800,
      consultation_duration_minutes: 15,
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '12:00',
      is_active: true,
    });
    createdDoctorId = doc.id;
  } catch (err) {
    console.error('Setup failed:', err);
    return;
  }

  // TEST 1: Register 3 Patient Appointments & Queue Tokens
  let token1Id = '', token2Id = '', token3Id = '';
  try {
    const slots = await calculateAvailableSlots(createdDoctorId, testDate);

    const res1 = await createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Patient 1 (Alice)',
      patient_phone: '+91-9876600001',
      appointment_date: testDate,
      appointment_time: slots[0] || '09:00 AM',
    });
    token1Id = res1.token.id;

    const res2 = await createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Patient 2 (Bob)',
      patient_phone: '+91-9876600002',
      appointment_date: testDate,
      appointment_time: slots[1] || '09:15 AM',
    });
    token2Id = res2.token.id;

    const res3 = await createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Patient 3 (Charlie)',
      patient_phone: '+91-9876600003',
      appointment_date: testDate,
      appointment_time: slots[2] || '09:30 AM',
    });
    token3Id = res3.token.id;

    const tokens = await fetchQueueTokens(testHospitalId);
    const passed = Boolean(token1Id && token2Id && token3Id && tokens.length >= 3);

    logTest(
      1,
      'Queue Tokens Registration',
      passed,
      `Registered 3 OPD tokens: ${res1.token.token_number}, ${res2.token.token_number}, ${res3.token.token_number}.`
    );
  } catch (err) {
    logTest(1, 'Queue Tokens Registration', false, String(err));
  }

  // TEST 2: Patient Queue Metrics Calculation (Initial State)
  try {
    const metrics1 = await getPatientQueueMetrics(token1Id);
    const metrics3 = await getPatientQueueMetrics(token3Id);

    const passed1 = metrics1.current_token === 'None' && metrics1.people_ahead === 0 && metrics1.estimated_wait_minutes === 0;
    const passed3 = metrics3.current_token === 'None' && metrics3.people_ahead === 2 && metrics3.estimated_wait_minutes === 30; // 2 people * 15m

    const passed = passed1 && passed3;

    logTest(
      2,
      'Patient Queue Metrics Calculation (No Fake Timers)',
      passed,
      `Patient 1 ahead: ${metrics1.people_ahead} (Wait: ${metrics1.estimated_wait_minutes}m). Patient 3 ahead: ${metrics3.people_ahead} (Wait: ${metrics3.estimated_wait_minutes}m).`
    );
  } catch (err) {
    logTest(2, 'Patient Queue Metrics Calculation', false, String(err));
  }

  // TEST 3: Reception Mark Checked-In Action
  try {
    const updated = await updateQueueStatus(token1Id, 'CHECKED_IN');
    const metrics1 = await getPatientQueueMetrics(token1Id);

    const passed = updated.status === 'CHECKED_IN' && Boolean(metrics1.checked_in_at);

    logTest(
      3,
      'Reception Check-In Action',
      passed,
      `Token '${updated.token_number}' marked CHECKED_IN at ${updated.checked_in_at}.`
    );
  } catch (err) {
    logTest(3, 'Reception Check-In Action', false, String(err));
  }

  // TEST 4: Reception Call Next Patient Action (Updates Current Token & Patient Metrics)
  try {
    const calledToken = await callNextPatient(testHospitalId, createdDoctorId);
    const metrics3 = await getPatientQueueMetrics(token3Id);

    const passed = Boolean(
      calledToken &&
      calledToken.id === token1Id &&
      calledToken.status === 'CALLED' &&
      metrics3.current_token === calledToken.token_number &&
      metrics3.people_ahead === 1 &&
      metrics3.estimated_wait_minutes === 15 // 1 ahead * 15m
    );

    logTest(
      4,
      'Reception Call Next Patient (Patient Metrics Recalculated)',
      passed,
      `Called token '${calledToken?.token_number}'. Patient 3 updated: Current Token '${metrics3.current_token}', People Ahead: ${metrics3.people_ahead}, Est. Wait: ${metrics3.estimated_wait_minutes}m.`
    );
  } catch (err) {
    logTest(4, 'Reception Call Next Patient', false, String(err));
  }

  // TEST 5: Reception Advance Queue (Auto-completes current & calls Patient 2)
  try {
    const nextCalled = await callNextPatient(testHospitalId, createdDoctorId);
    const metrics3 = await getPatientQueueMetrics(token3Id);

    const token1 = (await fetchQueueTokens(testHospitalId)).find(t => t.id === token1Id);

    const passed = Boolean(
      token1?.status === 'COMPLETED' &&
      nextCalled?.id === token2Id &&
      nextCalled?.status === 'CALLED' &&
      metrics3.current_token === nextCalled.token_number &&
      metrics3.people_ahead === 0 &&
      metrics3.estimated_wait_minutes === 0
    );

    logTest(
      5,
      'Reception Queue Advance & Auto-Completion',
      passed,
      `Token 1 auto-completed (${token1?.status}). Token 2 called ('${nextCalled?.token_number}'). Patient 3 metrics: People Ahead: ${metrics3.people_ahead}, Est. Wait: ${metrics3.estimated_wait_minutes}m.`
    );
  } catch (err) {
    logTest(5, 'Reception Queue Advance & Auto-Completion', false, String(err));
  }

  // TEST 6: Reception Skip / No-Show Action
  try {
    const cancelledToken = await updateQueueStatus(token3Id, 'CANCELLED');
    const metrics3 = await getPatientQueueMetrics(token3Id);

    const passed = cancelledToken.status === 'CANCELLED' && metrics3.status === 'CANCELLED';

    logTest(
      6,
      'Reception Skip / No-Show Action',
      passed,
      `Token 3 marked CANCELLED/NO-SHOW. Realtime status correctly updated to '${metrics3.status}'.`
    );
  } catch (err) {
    logTest(6, 'Reception Skip / No-Show Action', false, String(err));
  }

  // TEST 7: Realtime Event Subscriber Sync
  try {
    let subscriberFired = false;
    const unsub = subscribeToQueueUpdates(() => {
      subscriberFired = true;
    });

    // Reception changes queue status in DB
    await updateQueueStatus(token2Id, 'COMPLETED');

    const passed = subscriberFired;
    unsub();

    logTest(
      7,
      'Realtime Event Subscriber Sync',
      passed,
      `Reception DB mutation automatically triggered realtime subscriber notification to update Patient UI.`
    );
  } catch (err) {
    logTest(7, 'Realtime Event Subscriber Sync', false, String(err));
  }

  console.log('\n----------------------------------------------------------------');
  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('✅ ALL 7 PHASE 6 LIVE QUEUE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('----------------------------------------------------------------\n');
}

runPhase6LiveQueueTests();
