import { dbEngine } from '../src/lib/dbEngine';
import { createAppointment, calculateAvailableSlots } from '../src/services/appointmentService';

async function testAllDoctorsBooking() {
  console.log('Testing appointment booking across all 6 doctors in dbEngine...');
  const doctors = dbEngine.getDoctors('hosp-101');
  console.log(`Found ${doctors.length} doctors.`);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  for (const doc of doctors) {
    console.log(`\nDoctor: ${doc.name} (ID: ${doc.id})`);
    console.log(`  Specialization: ${doc.specialization}`);
    console.log(`  Working Days: ${doc.available_days?.join(', ')}`);
    console.log(`  Hours: ${doc.start_time} - ${doc.end_time}`);

    const slotsToday = await calculateAvailableSlots(doc.id, todayStr);
    console.log(`  Slots for Today (${todayStr}): ${slotsToday.length} slots`);

    const slotsTomorrow = await calculateAvailableSlots(doc.id, tomorrowStr);
    console.log(`  Slots for Tomorrow (${tomorrowStr}): ${slotsTomorrow.length} slots`);

    // Try booking for tomorrow with first slot if available
    if (slotsTomorrow.length > 0) {
      try {
        const res = await createAppointment({
          hospital_id: 'hosp-101',
          department_id: doc.department_id,
          doctor_id: doc.id,
          patient_name: 'Test Patient',
          patient_phone: '+91-9876543210',
          appointment_date: tomorrowStr,
          appointment_time: slotsTomorrow[0],
          notes: 'Test booking'
        });
        console.log(`  ✅ Booking succeeded for tomorrow: Appt ID ${res.appointment.id}, Token: ${res.token.token_number}`);
      } catch (err: any) {
        console.error(`  ❌ Booking FAILED for tomorrow: ${err.message}`);
      }
    } else {
      console.warn(`  ⚠️ NO SLOTS for tomorrow (${tomorrowStr})!`);
    }
  }
}

testAllDoctorsBooking();
