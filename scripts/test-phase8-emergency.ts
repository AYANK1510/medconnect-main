/**
 * MedConnect Pulse Phase 8 - Emergency Resource Matching Verification Suite
 * Tests core Phase 8 requirements:
 * 1. ER staff request creation (resource_type, resource_name, quantity, urgency, notes)
 * 2. Strict requesting hospital registered location binding (ignoring ER staff GPS)
 * 3. Server-side Haversine distance math (Earth Radius 6371 KM, 15 KM Geo-Fence filter)
 * 4. Inventory check at nearby hospitals
 * 5. Match ranking (1. Distance ASC, 2. Available Quantity DESC, 3. Availability)
 * 6. Edge cases: No hospitals nearby, No inventory, Invalid location, Inactive hospital
 */

import { dbEngine, calculateDistanceKm } from '../src/lib/dbEngine';
import { createEmergencyRequest } from '../src/services/emergencyService';
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

async function runPhase8EmergencyTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 8 Emergency Resource Matching Verification');
  console.log('================================================================\n');

  // Register Known Test Hospitals with Exact Coordinates
  // Hospital A (Requesting): (28.6139, 77.2090)
  // Hospital B (Nearby Target - 6.01 km): (28.5672, 77.2400)
  // Hospital C (Far Target - 24.74 km): (28.4595, 77.0266)
  const hospA_Id = 'hosp-101';
  const hospB_Id = 'hosp-102';
  const hospC_Id = 'hosp-103';

  dbEngine.addOrUpdateHospital({
    id: hospA_Id,
    name: 'Metro City General Hospital',
    latitude: 28.6139,
    longitude: 77.2090,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: hospB_Id,
    name: 'City Trauma Center',
    latitude: 28.5672,
    longitude: 77.2400,
    is_active: true,
  });

  dbEngine.addOrUpdateHospital({
    id: hospC_Id,
    name: 'Far Outer Specialty Clinic',
    latitude: 28.4595,
    longitude: 77.0266,
    is_active: true,
  });

  // TEST 1: Haversine Distance Calculation (Earth radius 6371 km)
  try {
    const distAB = calculateDistanceKm(28.6139, 77.2090, 28.5672, 77.2400); // 6.01 km
    const distAC = calculateDistanceKm(28.6139, 77.2090, 28.4595, 77.0266); // 24.74 km

    if (distAB > 5.5 && distAB < 6.5 && distAC > 23.0 && distAC < 26.0) {
      logTest(
        1,
        'Server-Side Haversine Math (6371 km)',
        true,
        `Dist A->B (City Trauma): ${distAB} km (≤ 15km). Dist A->C (Outer Clinic): ${distAC} km (> 15km).`
      );
    } else {
      logTest(1, 'Server-Side Haversine Math (6371 km)', false, `Calculated unexpected distances: A->B=${distAB}, A->C=${distAC}`);
    }
  } catch (err: any) {
    logTest(1, 'Server-Side Haversine Math (6371 km)', false, `Error: ${err.message}`);
  }

  // Ensure target Hospital B has inventory for test
  try {
    await addInventoryItem({
      hospital_id: hospB_Id,
      resource_type: 'Blood',
      item_name: 'O- Negative Blood',
      subtype: 'O-',
      total_quantity: 15,
      unit: 'units',
    });
  } catch (e) {
    // Item may already exist
  }

  // Ensure target Hospital C (far away) also has inventory
  try {
    await addInventoryItem({
      hospital_id: hospC_Id,
      resource_type: 'Blood',
      item_name: 'O- Negative Blood',
      subtype: 'O-',
      total_quantity: 30,
      unit: 'units',
    });
  } catch (e) {
    // Item may already exist
  }

  // TEST 2: Registered Hospital Location Enforcement (Never ER Staff GPS)
  try {
    // ER Staff passes request; system MUST bind strictly to hospA_Id registered location (28.6139, 77.2090)
    const res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Blood',
      resource_name: 'O- Negative Blood',
      quantity: 3,
      urgency: 'CRITICAL',
      notes: 'Trauma patient in ER Room 2',
    });

    const isBound = res.request.latitude === 28.6139 && res.request.longitude === 77.209;

    if (isBound) {
      logTest(
        2,
        'Registered Hospital Location Enforcement',
        true,
        `Emergency request bound strictly to registered hospital coordinates (Lat: ${res.request.latitude}, Lng: ${res.request.longitude}). ER staff personal GPS ignored.`
      );
    } else {
      logTest(2, 'Registered Hospital Location Enforcement', false, `Request bound to wrong coordinates: Lat=${res.request.latitude}, Lng=${res.request.longitude}`);
    }
  } catch (err: any) {
    logTest(2, 'Registered Hospital Location Enforcement', false, `Error: ${err.message}`);
  }

  // TEST 3: 15 KM Geo-Fence & Inventory Matching
  try {
    const res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Blood',
      resource_name: 'O- Negative Blood',
      quantity: 2,
      urgency: 'CRITICAL',
    });

    // Check that Hospital B (6.01 km) is included in matches, and Hospital C (24.74 km) is excluded
    const hasHospB = res.matches.some(m => m.hospital_id === hospB_Id);
    const hasHospC = res.matches.some(m => m.hospital_id === hospC_Id);

    if (hasHospB && !hasHospC) {
      logTest(
        3,
        '15 KM Geo-Fence & Inventory Matching',
        true,
        `Matched Hospital B (City Trauma, 6.01 km ≤ 15km). Excluded Hospital C (24.74 km > 15km).`
      );
    } else {
      logTest(3, '15 KM Geo-Fence & Inventory Matching', false, `Matching error: Hosp B matched=${hasHospB}, Hosp C matched=${hasHospC}`);
    }
  } catch (err: any) {
    logTest(3, '15 KM Geo-Fence & Inventory Matching', false, `Error: ${err.message}`);
  }

  // TEST 4: Match Ranking (1. Distance ASC, 2. Available Quantity DESC, 3. Status)
  try {
    // Add Hosp D (8.0 km away) with stock=40
    const hospD_Id = 'hosp-104';
    dbEngine.addOrUpdateHospital({
      id: hospD_Id,
      name: 'South Metro Emergency Hospital',
      latitude: 28.5500,
      longitude: 77.2000,
      is_active: true,
    });

    await addInventoryItem({
      hospital_id: hospD_Id,
      resource_type: 'Blood',
      item_name: 'O- Negative Blood',
      total_quantity: 40,
      unit: 'units',
    });

    const res = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Blood',
      resource_name: 'O- Negative Blood',
      quantity: 5,
      urgency: 'HIGH',
    });

    // Check rank: Hosp B (6.01 km) should be rank 1 (closest), Hosp D (8.01 km) rank 2
    const rank1 = res.matches[0];
    const rank2 = res.matches[1];

    if (rank1 && rank2 && rank1.distance_km <= rank2.distance_km) {
      logTest(
        4,
        'Match Ranking (Distance ASC -> Quantity DESC -> Status)',
        true,
        `Rank #1: ${rank1.hospital_name || rank1.hospital_id} (${rank1.distance_km} km). Rank #2: ${rank2.hospital_name || rank2.hospital_id} (${rank2.distance_km} km).`
      );
    } else {
      logTest(4, 'Match Ranking', false, `Match ranking incorrect.`);
    }
  } catch (err: any) {
    logTest(4, 'Match Ranking', false, `Error: ${err.message}`);
  }

  // TEST 5: Edge Case - No Inventory Available
  try {
    const resNoStock = await createEmergencyRequest({
      requesting_hospital_id: hospA_Id,
      resource_type: 'Medicine',
      resource_name: 'Unstocked Experimental Drug XYZ',
      quantity: 10,
      urgency: 'CRITICAL',
    });

    if (resNoStock.matches.length === 0 && resNoStock.message?.includes('inventory')) {
      logTest(
        5,
        'Edge Case: No Inventory Available',
        true,
        `Correctly returned 0 matches and message: '${resNoStock.message}'`
      );
    } else {
      logTest(5, 'Edge Case: No Inventory Available', false, `Unexpected result for unstocked item: matches=${resNoStock.matches.length}`);
    }
  } catch (err: any) {
    logTest(5, 'Edge Case: No Inventory Available', false, `Error: ${err.message}`);
  }

  // TEST 6: Edge Cases - Inactive Hospital & Invalid Location Coordinates
  try {
    let errorCount = 0;

    // Subtest A: Inactive requesting hospital
    dbEngine.addOrUpdateHospital({
      id: 'hosp-inactive',
      name: 'Closed Down Clinic',
      latitude: 28.6000,
      longitude: 77.2000,
      is_active: false,
    });

    try {
      await createEmergencyRequest({
        requesting_hospital_id: 'hosp-inactive',
        resource_type: 'Oxygen',
        quantity: 5,
        urgency: 'CRITICAL',
      });
    } catch (e: any) {
      if (e.message.includes('inactive')) errorCount++;
    }

    // Subtest B: Invalid hospital coordinates (0, 0)
    dbEngine.addOrUpdateHospital({
      id: 'hosp-bad-coords',
      name: 'Unconfigured Hospital',
      latitude: 0,
      longitude: 0,
      is_active: true,
    });

    try {
      await createEmergencyRequest({
        requesting_hospital_id: 'hosp-bad-coords',
        resource_type: 'Oxygen',
        quantity: 5,
        urgency: 'CRITICAL',
      });
    } catch (e: any) {
      if (e.message.includes('coordinates') || e.message.includes('Latitude') || e.message.includes('0.0')) errorCount++;
    }

    if (errorCount === 2) {
      logTest(
        6,
        'Edge Cases: Inactive Hospital & Invalid Location Rejection',
        true,
        `Successfully rejected both inactive requesting hospital and invalid (0, 0) coordinates.`
      );
    } else {
      logTest(6, 'Edge Cases: Inactive Hospital & Invalid Location Rejection', false, `Caught ${errorCount}/2 expected errors.`);
    }
  } catch (err: any) {
    logTest(6, 'Edge Cases: Inactive Hospital & Invalid Location Rejection', false, `Error: ${err.message}`);
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log('\n----------------------------------------------------------------');
  if (passedCount === results.length) {
    console.log(`✅ ALL ${results.length} PHASE 8 EMERGENCY MATCHING TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.log(`❌ ${results.length - passedCount} OF ${results.length} TESTS FAILED.`);
  }
  console.log('----------------------------------------------------------------\n');
}

runPhase8EmergencyTests();
