/**
 * MedConnect Pulse Phase 4 - Doctors, Departments & Schedules Verification Suite
 * Tests 5 core requirements:
 * 1. Create Doctor (with department, specialization, consultation fee)
 * 2. Create Doctor Schedule (working days, start/end time, slot duration)
 * 3. Dynamic Availability Generation (without hardcoded slots)
 * 4. Booked Slot Disappearance (booking removes slot from available list)
 * 5. Inactive Doctor Block (deactivated doctor returns 0 slots and blocks bookings)
 */

import { dbEngine } from '../src/lib/dbEngine';

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

async function runPhase4DoctorTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 4 Doctor & Schedule Verification');
  console.log('================================================================\n');

  const testHospitalId = 'hosp-101';
  let createdDoctorId = '';
  let createdDeptId = '';

  // Test 1: Create Doctor & Department
  try {
    const dept = dbEngine.createDepartment(testHospitalId, 'Cardiology & Vascular', 'Specialized heart care unit');
    createdDeptId = dept.id;

    const doctor = dbEngine.createDoctor({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      name: 'Dr. Ananya Roy',
      specialization: 'Interventional Cardiology',
      consultation_fee: 750,
      consultation_duration_minutes: 30,
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '12:00',
      is_active: true,
    });
    createdDoctorId = doctor.id;

    const isCreated = Boolean(doctor.id) && doctor.consultation_fee === 750 && doctor.consultation_duration_minutes === 30;

    logTest(
      1,
      'Create Doctor & Department',
      isCreated,
      `Created Doctor '${doctor.name}' (ID: ${doctor.id}) in Dept '${dept.name}' with Fee: ₹${doctor.consultation_fee}, Duration: ${doctor.consultation_duration_minutes}m.`
    );
  } catch (err) {
    logTest(1, 'Create Doctor & Department', false, String(err));
  }

  // Test 2: Create Schedule Verification
  try {
    const doc = dbEngine.getDoctors(testHospitalId, true).find(d => d.id === createdDoctorId);
    const scheduleValid = Boolean(
      doc &&
      doc.available_days.includes('Monday') &&
      doc.start_time === '09:00' &&
      doc.end_time === '12:00' &&
      doc.consultation_duration_minutes === 30
    );

    logTest(
      2,
      'Create Schedule Verification',
      scheduleValid,
      `Schedule configured for ${doc?.name}: Working Days [${doc?.available_days.join(', ')}], Hours ${doc?.start_time}-${doc?.end_time}, Slot: ${doc?.consultation_duration_minutes}m.`
    );
  } catch (err) {
    logTest(2, 'Create Schedule Verification', false, String(err));
  }

  // Test 3: Generate Dynamic Availability
  const targetDateStr = '2026-09-07'; // Monday
  let initialSlots: string[] = [];

  try {
    initialSlots = dbEngine.calculateAvailableSlots(createdDoctorId, targetDateStr);
    
    // Expected slots for 09:00 to 12:00 with 30m duration:
    // 09:00 AM, 09:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM (6 slots)
    const expectedSlotCount = 6;
    const hasGeneratedSlots = initialSlots.length === expectedSlotCount;

    logTest(
      3,
      'Dynamic Availability Generation (No Hardcoded Slots)',
      hasGeneratedSlots,
      `Dynamically generated ${initialSlots.length} available slots for Monday (${targetDateStr}): [${initialSlots.join(', ')}].`
    );
  } catch (err) {
    logTest(3, 'Dynamic Availability Generation', false, String(err));
  }

  // Test 4: Booked Slot Disappears
  try {
    const bookedSlotTime = initialSlots[2] || '10:00 AM'; // Book "10:00 AM"

    dbEngine.createAppointment({
      hospital_id: testHospitalId,
      department_id: createdDeptId,
      doctor_id: createdDoctorId,
      patient_name: 'Amit Sharma',
      patient_phone: '+91-9876543299',
      appointment_date: targetDateStr,
      appointment_time: bookedSlotTime,
      notes: 'Routine checkup',
    });

    const updatedSlots = dbEngine.calculateAvailableSlots(createdDoctorId, targetDateStr);
    const slotDisappeared = !updatedSlots.includes(bookedSlotTime) && updatedSlots.length === initialSlots.length - 1;

    logTest(
      4,
      'Booked Slot Disappears from Available List',
      slotDisappeared,
      `Slot '${bookedSlotTime}' was booked. Re-calculated availability now has ${updatedSlots.length} slots. Booked slot successfully DISAPPEARED.`
    );
  } catch (err) {
    logTest(4, 'Booked Slot Disappears', false, String(err));
  }

  // Test 5: Inactive Doctor Cannot Receive Bookings
  try {
    // Deactivate doctor
    dbEngine.toggleDoctorActive(createdDoctorId);
    
    const inactiveDoctor = dbEngine.getDoctors(testHospitalId, true).find(d => d.id === createdDoctorId);
    const slotsForInactive = dbEngine.calculateAvailableSlots(createdDoctorId, targetDateStr);
    const isSlotListEmpty = slotsForInactive.length === 0;

    let bookingBlocked = false;
    try {
      dbEngine.createAppointment({
        hospital_id: testHospitalId,
        department_id: createdDeptId,
        doctor_id: createdDoctorId,
        patient_name: 'Priya Malhotra',
        patient_phone: '+91-9876543288',
        appointment_date: targetDateStr,
        appointment_time: '11:00 AM',
      });
    } catch {
      bookingBlocked = true; // Exception expected when attempting to book inactive doctor!
    }

    const testPassed = isSlotListEmpty && bookingBlocked && inactiveDoctor?.is_active === false;

    logTest(
      5,
      'Inactive Doctor Cannot Receive Bookings',
      testPassed,
      `Deactivated doctor '${inactiveDoctor?.name}' (is_active: false). Availability generated: ${slotsForInactive.length} slots. New booking attempts correctly BLOCKED.`
    );
  } catch (err) {
    logTest(5, 'Inactive Doctor Cannot Receive Bookings', false, String(err));
  }

  console.log('\n----------------------------------------------------------------');
  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('✅ ALL 5 PHASE 4 DOCTOR & SCHEDULE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('----------------------------------------------------------------\n');
}

runPhase4DoctorTests();
