/**
 * MedConnect Pulse - End-to-End Verification Suite for:
 * 1. Real Telegram Message Trigger & Delivery
 * 2. Manual Hospital Addition with 15 km Haversine Radius Validation & Duplicate Prevention
 */

import { dbEngine } from '../src/lib/dbEngine';
import { sendTelegramEmergencyAlert, formatTelegramMessage, validateAndProcessTelegramCallback } from '../src/services/telegramService';
import { createEmergencyRequest } from '../src/services/emergencyService';
import { registerNetworkHospital, validateHospitalRadius, checkDuplicateHospital } from '../src/services/hospitalService';
import { calculateDistanceKm } from '../src/services/geoService';

async function runTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse: Telegram & Hospital Addition Verification');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, title: string, details: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[TEST ${totalCount}] ✅ PASS - ${title}: ${details}`);
    } else {
      console.error(`[TEST ${totalCount}] ❌ FAIL - ${title}: ${details}`);
    }
  }

  // --- 1. TELEGRAM TESTS ---
  console.log('--- Feature 1: Telegram Notification Verification ---');

  // Test 1.1: Live Real Delivery via Telegram API
  try {
    const liveAlert = await sendTelegramEmergencyAlert({
      requestId: 'em_e2e_verify_001',
      supplyingHospitalId: 'hosp-102',
      emergencyHospital: 'Metro City General Hospital',
      resource: 'O- Negative Blood',
      quantity: 3,
      distanceKm: 4.2,
      urgency: 'CRITICAL',
    });

    assert(
      liveAlert.success === true && liveAlert.status === 'DISPATCHED' && liveAlert.payload?.ok === true,
      'Live Telegram Delivery',
      `Message delivered to Telegram bot. Message ID: ${liveAlert.payload?.result?.message_id}, Chat: ${liveAlert.payload?.result?.chat?.id}`
    );
  } catch (err: any) {
    assert(false, 'Live Telegram Delivery', `Failed with error: ${err.message}`);
  }

  // Test 1.2: Underscores & Markdown Special Characters Entity Resilience
  try {
    const oddUnderscoresAlert = await sendTelegramEmergencyAlert({
      requestId: 'em_req_complex_odd_123',
      supplyingHospitalId: 'hosp-102',
      emergencyHospital: 'Trauma_Center [Wing_A]',
      resource: 'ICU_Bed_Advanced',
      quantity: 2,
      distanceKm: 5.1,
      urgency: 'HIGH_PRIORITY',
    });

    assert(
      oddUnderscoresAlert.success === true && oddUnderscoresAlert.payload?.ok === true,
      'Markdown Entity Parsing Resilience',
      `Delivered successfully without entity parsing crash. Telegram Message ID: ${oddUnderscoresAlert.payload?.result?.message_id}`
    );
  } catch (err: any) {
    assert(false, 'Markdown Entity Parsing Resilience', `Failed: ${err.message}`);
  }

  // Test 1.3: Zero Pre-matched Inventory Emergency Alert Broadcast
  try {
    const zeroMatchReq = await createEmergencyRequest({
      requesting_hospital_id: 'hosp-101',
      resource_type: 'blood',
      resource_name: 'Rare Uncataloged Blood Type',
      quantity: 99,
      urgency: 'CRITICAL',
      notes: 'Testing network broadcast when zero exact matches exist',
    });

    assert(
      zeroMatchReq.matches.length > 0 && zeroMatchReq.matches.some(m => m.status === 'PENDING'),
      'Zero-Match Geo-Fence Broadcast',
      `Broadcasted emergency alert to ${zeroMatchReq.matches.length} active hospitals within 15 km network.`
    );
  } catch (err: any) {
    assert(false, 'Zero-Match Geo-Fence Broadcast', `Failed: ${err.message}`);
  }

  // Test 1.4: Telegram Callback Handling & Backend Validation
  try {
    // Arbitrary callback check
    let rejectedArbitrary = false;
    try {
      await validateAndProcessTelegramCallback('ACCEPT:fake-nonexistent-request:hosp-102');
    } catch {
      rejectedArbitrary = true;
    }
    assert(rejectedArbitrary, 'Backend Callback Validation', 'Arbitrary / fake Telegram callbacks correctly rejected.');
  } catch (err: any) {
    assert(false, 'Backend Callback Validation', `Failed: ${err.message}`);
  }

  console.log('\n--- Feature 2: Manual Hospital Addition Verification ---');

  // Test 2.1: Radius Validation Logic
  const validCoords = { lat: 28.5800, lng: 77.2200 }; // ~4.5 km from central hub (28.6139, 77.2090)
  const outsideCoords = { lat: 28.3000, lng: 77.1000 }; // ~36 km from central hub

  const checkValid = validateHospitalRadius(validCoords.lat, validCoords.lng);
  assert(
    checkValid.isValid === true && checkValid.distanceKm <= 15.0,
    'Valid Radius Check (< 15 km)',
    `Distance: ${checkValid.distanceKm} km (<= 15.0 km allowed).`
  );

  const checkOutside = validateHospitalRadius(outsideCoords.lat, outsideCoords.lng);
  assert(
    checkOutside.isValid === false && checkOutside.distanceKm > 15.0,
    'Outside Radius Check (> 15 km Rejection)',
    `Distance: ${checkOutside.distanceKm} km (> 15.0 km). Correctly flagged as invalid.`
  );

  // Test 2.2: Register Valid Hospital Within 15 KM
  const newHospName = `Fortis South Extension ${Date.now()}`;
  try {
    const registered = await registerNetworkHospital({
      name: newHospName,
      code: 'HOSP-FSE',
      address: '92 Ring Road, South Extension',
      latitude: validCoords.lat,
      longitude: validCoords.lng,
      phone: '+91-11-45678901',
      emergency_contact: '+91-11-99990009',
      icuBedsAvailable: 5,
      icuBedsTotal: 8,
      oxygenUnitsAvailable: 25,
      oxygenUnitsTotal: 30,
      bloodInventory: { 'O-': 10 },
    });

    const inDb = dbEngine.getHospitals().find(h => h.id === registered.dbHospital.id);
    const inInv = dbEngine.getInventory(registered.dbHospital.id);

    assert(
      !!inDb && inDb.name === newHospName && inInv.length >= 3,
      'Hospital Registration & DB Persistence',
      `Registered hospital "${newHospName}" in dbEngine at ${registered.distanceKm} km with ${inInv.length} inventory items.`
    );
  } catch (err: any) {
    assert(false, 'Hospital Registration & DB Persistence', `Failed: ${err.message}`);
  }

  // Test 2.3: Reject Registration Outside 15 KM
  let outsideRejected = false;
  try {
    await registerNetworkHospital({
      name: 'Faraway Regional Hospital',
      address: '100 Highway Link',
      latitude: outsideCoords.lat,
      longitude: outsideCoords.lng,
      phone: '+91-11-12345678',
    });
  } catch (err: any) {
    outsideRejected = err.message.includes('outside the allowed 15');
  }

  assert(
    outsideRejected,
    'Radius Enforcement on Registration',
    'Registration for hospital outside 15 km was strictly blocked.'
  );

  // Test 2.4: Prevent Duplicate Hospital Registration
  let dupNameRejected = false;
  try {
    await registerNetworkHospital({
      name: newHospName, // Same name as registered earlier
      address: 'Different Address',
      latitude: 28.6000,
      longitude: 77.2100,
      phone: '+91-11-99887766',
    });
  } catch (err: any) {
    dupNameRejected = err.message.includes('Duplicate Hospital');
  }

  assert(
    dupNameRejected,
    'Duplicate Hospital Name Prevention',
    'Attempting to register a hospital with an existing name was blocked.'
  );

  // Test 2.5: Prevent Duplicate Location (< 50 meters)
  let dupLocRejected = false;
  try {
    await registerNetworkHospital({
      name: 'Completely Different Name',
      address: 'Same Coordinates',
      latitude: validCoords.lat,
      longitude: validCoords.lng,
      phone: '+91-11-11223344',
    });
  } catch (err: any) {
    dupLocRejected = err.message.includes('Duplicate Location');
  }

  assert(
    dupLocRejected,
    'Duplicate Location Prevention',
    'Attempting to register another hospital at existing coordinates was blocked.'
  );

  console.log('\n================================================================');
  console.log(`Verification Complete: ${passedCount}/${totalCount} tests passed.`);
  console.log('================================================================');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Fatal error during test suite:', e);
  process.exit(1);
});
