/**
 * MedConnect Pulse Phase 5 - Real Appointment System Verification Suite
 * Tests core Phase 5 requirements:
 * 1. End-to-end appointment creation & queue token generation (status: BOOKED)
 * 2. Double booking prevention under concurrent attempts (Promise.all)
 * 3. Duplicate booking prevention for same patient
 * 4. Past appointment date/time rejection
 * 5. Inactive doctor & invalid hospital ID rejection
 * 6. Appointment status lifecycle transitions (BOOKED, CHECKED_IN, IN_QUEUE, COMPLETED, CANCELLED, NO_SHOW)
 * 7. Cancel appointment & time slot recovery
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  createAppointment,
  createAppointmentAsync,
  calculateAvailableSlots,
  cancelAppointment,
  updateAppointmentStatus,
  fetchAppointments
} from '../src/services/appointmentService';

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

async function runPhase5AppointmentTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 5 Real Appointment System Verification');
  console.log('================================================================\n');

  const testHospitalId = 'hosp-101';
  let createdDoctorId = '';
  let createdDeptId = '';
  const testDate = '2026-09-08'; // Future Tuesday

  // Setup: Create Doctor and Department
  try {
    const dept = dbEngine.createDepartment(testHospitalId, 'Pulmonology', 'Chest & Respiratory Unit');
    createdDeptId = dept.id;

    const doc = dbEngine.createDoctor({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      name: 'Dr. Vikram Sethi',
      specialization: 'Pulmonologist',
      consultation_fee: 600,
      consultation_duration_minutes: 30,
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

  // TEST 1: Create Appointment & Queue Token Generation
  let test1ApptId = '';
  let test1SlotTime = '';
  try {
    const slots = await calculateAvailableSlots(createdDoctorId, testDate);
    test1SlotTime = slots[0] || '09:00 AM';

    const res = await createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Rahul Varma',
      patient_phone: '+91-9876500001',
      appointment_date: testDate,
      appointment_time: test1SlotTime,
      notes: 'Initial pulmonology checkup'
    });

    test1ApptId = res.appointment.id;
    const passed = Boolean(
      res.appointment.id &&
      res.appointment.status === 'BOOKED' &&
      res.token.token_number &&
      res.token.status === 'WAITING'
    );

    logTest(
      1,
      'End-to-End Booking & Queue Token Generation',
      passed,
      `Appt ID: ${res.appointment.id}, Status: '${res.appointment.status}', Token: '${res.token.token_number}' (Seq: ${res.token.sequence_number}).`
    );
  } catch (err) {
    logTest(1, 'End-to-End Booking & Queue Token Generation', false, String(err));
  }

  // TEST 2: Double Booking Prevention under Concurrent Attempts
  try {
    const slots = await calculateAvailableSlots(createdDoctorId, testDate);
    const targetSlot = slots[0] || '09:30 AM';

    // Two concurrent booking attempts for the EXACT SAME doctor, date, and slot
    const promises = [
      createAppointmentAsync({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Patient A',
        patient_phone: '+91-9876500002',
        appointment_date: testDate,
        appointment_time: targetSlot,
      }),
      createAppointmentAsync({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Patient B',
        patient_phone: '+91-9876500003',
        appointment_date: testDate,
        appointment_time: targetSlot,
      })
    ];

    const resultsSettled = await Promise.allSettled(promises);
    const fulfilled = resultsSettled.filter(r => r.status === 'fulfilled');
    const rejected = resultsSettled.filter(r => r.status === 'rejected');

    const passed = fulfilled.length === 1 && rejected.length === 1;

    logTest(
      2,
      'Double Booking Prevention (Concurrent Attempts)',
      passed,
      `Concurrent requests: ${fulfilled.length} succeeded, ${rejected.length} blocked with conflict error. Double booking prevented!`
    );
  } catch (err) {
    logTest(2, 'Double Booking Prevention (Concurrent Attempts)', false, String(err));
  }

  // TEST 3: Duplicate Booking Prevention (Same Patient Same Slot)
  try {
    let duplicateBlocked = false;
    try {
      await createAppointment({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Rahul Varma',
        patient_phone: '+91-9876500001',
        appointment_date: testDate,
        appointment_time: test1SlotTime, // Same slot as Test 1
      });
    } catch {
      duplicateBlocked = true;
    }

    logTest(
      3,
      'Duplicate Booking Prevention (Same Patient & Slot)',
      duplicateBlocked,
      `Attempt by '+91-9876500001' to re-book already held slot was correctly blocked.`
    );
  } catch (err) {
    logTest(3, 'Duplicate Booking Prevention', false, String(err));
  }

  // TEST 4: Past Appointment Date Rejection
  try {
    let pastBlocked = false;
    try {
      await createAppointment({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Kavita Singh',
        patient_phone: '+91-9876500004',
        appointment_date: '2025-01-01', // Past date
        appointment_time: '10:00 AM',
      });
    } catch (err: any) {
      if (err.message.includes('past dates')) {
        pastBlocked = true;
      }
    }

    logTest(
      4,
      'Past Appointment Date Rejection',
      pastBlocked,
      `Booking for past date '2025-01-01' was rejected by backend validation.`
    );
  } catch (err) {
    logTest(4, 'Past Appointment Date Rejection', false, String(err));
  }

  // TEST 5: Inactive Doctor & Invalid Hospital Rejection
  try {
    let invalidHospBlocked = false;
    try {
      await createAppointment({
        hospital_id: 'invalid-hosp-id-999',
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Test Patient',
        patient_phone: '+91-9876500005',
        appointment_date: testDate,
        appointment_time: '11:00 AM',
      });
    } catch (err: any) {
      if (err.message.includes('Invalid or inactive hospital')) {
        invalidHospBlocked = true;
      }
    }

    // Deactivate doctor and test booking rejection
    dbEngine.toggleDoctorActive(createdDoctorId);
    let inactiveDocBlocked = false;
    try {
      await createAppointment({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Test Patient',
        patient_phone: '+91-9876500006',
        appointment_date: testDate,
        appointment_time: '11:30 AM',
      });
    } catch (err: any) {
      if (err.message.includes('inactive')) {
        inactiveDocBlocked = true;
      }
    }
    // Re-activate doctor for subsequent tests
    dbEngine.toggleDoctorActive(createdDoctorId);

    const passed = invalidHospBlocked && inactiveDocBlocked;

    logTest(
      5,
      'Inactive Doctor & Invalid Hospital Rejection',
      passed,
      `Invalid hospital attempt blocked: ${invalidHospBlocked}, Inactive doctor attempt blocked: ${inactiveDocBlocked}.`
    );
  } catch (err) {
    logTest(5, 'Inactive Doctor & Invalid Hospital Rejection', false, String(err));
  }

  // TEST 6: Appointment Status Lifecycle Transitions
  try {
    const updatedCheckedIn = await updateAppointmentStatus(test1ApptId, 'CHECKED_IN');
    const updatedInQueue = await updateAppointmentStatus(test1ApptId, 'IN_QUEUE');
    const updatedCompleted = await updateAppointmentStatus(test1ApptId, 'COMPLETED');

    const token = dbEngine.getQueueTokens(testHospitalId).find(t => t.appointment_id === test1ApptId);

    const passed = Boolean(
      updatedCompleted.status === 'COMPLETED' &&
      token?.status === 'COMPLETED'
    );

    logTest(
      6,
      'Appointment Status Lifecycle Transitions',
      passed,
      `Status updated: BOOKED -> CHECKED_IN -> IN_QUEUE -> COMPLETED. Queue token status synced to '${token?.status}'.`
    );
  } catch (err) {
    logTest(6, 'Appointment Status Lifecycle Transitions', false, String(err));
  }

  // TEST 7: Cancel Appointment & Time Slot Recovery
  try {
    // Book a new appointment to test cancellation
    const slots = await calculateAvailableSlots(createdDoctorId, testDate);
    const cancelTargetSlot = slots[0] || '11:00 AM';

    const cancelAppt = await createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Suresh Raina',
      patient_phone: '+91-9876500007',
      appointment_date: testDate,
      appointment_time: cancelTargetSlot,
    });

    const slotsBeforeCancel = await calculateAvailableSlots(createdDoctorId, testDate);
    const isSlotBooked = !slotsBeforeCancel.includes(cancelTargetSlot);

    await cancelAppointment(cancelAppt.appointment.id);

    const slotsAfterCancel = await calculateAvailableSlots(createdDoctorId, testDate);
    const isSlotRecovered = slotsAfterCancel.includes(cancelTargetSlot);

    const passed = isSlotBooked && isSlotRecovered;

    logTest(
      7,
      'Cancel Appointment & Time Slot Recovery',
      passed,
      `Appointment cancelled. Slot '${cancelTargetSlot}' removed during booking and successfully RECOVERED after cancellation.`
    );
  } catch (err) {
    logTest(7, 'Cancel Appointment & Time Slot Recovery', false, String(err));
  }

  console.log('\n----------------------------------------------------------------');
  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('✅ ALL 7 PHASE 5 APPOINTMENT TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('----------------------------------------------------------------\n');
}

runPhase5AppointmentTests();
