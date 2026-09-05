/**
 * MedConnect Pulse Phase 7 - Real Inventory System Verification Suite
 * Tests core Phase 7 requirements:
 * 1. Adding inventory (Resource types: Oxygen, Blood, ICU Bed, Ventilator, Medicine, Other)
 * 2. Editing inventory (Updating resource name, total stock, unit, subtype)
 * 3. Stock increases & decreases
 * 4. Zero inventory handling (Valid state where total = 0 or available = 0)
 * 5. Insufficient inventory prevention (Deducting below reserved, negative stock, reserved > total)
 * 6. Reserved quantity & Available quantity formula (available = total - reserved)
 */

import { dbEngine } from '../src/lib/dbEngine';
import {
  fetchInventory,
  addInventoryItem,
  updateInventoryItem,
  increaseStock,
  decreaseStock
} from '../src/services/inventoryService';

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

async function runPhase7InventoryTests() {
  console.log('================================================================');
  console.log('MedConnect Pulse Phase 7 Real Inventory System Verification');
  console.log('================================================================\n');

  const testHospitalId = 'hosp-101';
  let oxygenItemId = '';
  let bloodItemId = '';
  let icuItemId = '';

  // TEST 1: Add New Resources across Resource Types (Oxygen, Blood, ICU Bed, Ventilator, Medicine, Other)
  try {
    const item1 = await addInventoryItem({
      hospital_id: testHospitalId,
      resource_type: 'Oxygen',
      item_name: 'High-Purity Oxygen Cylinder',
      subtype: 'Type E',
      total_quantity: 50,
      unit: 'cylinders',
    });
    oxygenItemId = item1.id;

    const item2 = await addInventoryItem({
      hospital_id: testHospitalId,
      resource_type: 'Blood',
      item_name: 'AB+ Positive Whole Blood',
      subtype: 'AB+',
      total_quantity: 20,
      unit: 'units',
    });
    bloodItemId = item2.id;

    const item3 = await addInventoryItem({
      hospital_id: testHospitalId,
      resource_type: 'ICU Bed',
      item_name: 'Negative Pressure ICU Bed',
      subtype: 'Isolation',
      total_quantity: 10,
      unit: 'beds',
    });
    icuItemId = item3.id;

    const isFormulaValid =
      item1.available_quantity === item1.total_quantity - item1.reserved_quantity &&
      item2.available_quantity === item2.total_quantity - item2.reserved_quantity &&
      item3.available_quantity === item3.total_quantity - item3.reserved_quantity;

    if (isFormulaValid && item1.total_quantity === 50 && item1.available_quantity === 50) {
      logTest(
        1,
        'Adding Inventory',
        true,
        `Created Oxygen (Total: 50, Avail: 50), Blood (Total: 20, Avail: 20), ICU Bed (Total: 10, Avail: 10). Formula available = total - reserved holds.`
      );
    } else {
      logTest(1, 'Adding Inventory', false, 'Formula available = total - reserved failed or initial stock mismatch.');
    }
  } catch (err: any) {
    logTest(1, 'Adding Inventory', false, `Error: ${err.message}`);
  }

  // TEST 2: Edit Resource Details & Total Quantity
  try {
    const edited = await updateInventoryItem(oxygenItemId, {
      item_name: 'High-Purity Oxygen Cylinder (Refilled)',
      subtype: 'Type E Jumbo',
      total_quantity: 65,
    });

    const expectedAvailable = 65 - edited.reserved_quantity;

    if (
      edited.item_name === 'High-Purity Oxygen Cylinder (Refilled)' &&
      edited.total_quantity === 65 &&
      edited.available_quantity === expectedAvailable
    ) {
      logTest(
        2,
        'Editing Inventory',
        true,
        `Updated item name to '${edited.item_name}', total stock to 65. Available correctly recalculated to ${edited.available_quantity}.`
      );
    } else {
      logTest(2, 'Editing Inventory', false, `Updated item returned unexpected values: Total=${edited.total_quantity}, Avail=${edited.available_quantity}`);
    }
  } catch (err: any) {
    logTest(2, 'Editing Inventory', false, `Error: ${err.message}`);
  }

  // TEST 3: Increase Stock and Decrease Stock
  try {
    // Increase stock by +15
    const afterIncrease = await increaseStock(bloodItemId, 15);
    // Decrease stock by -5
    const afterDecrease = await decreaseStock(bloodItemId, 5);

    const expectedTotal = 20 + 15 - 5; // 30
    const expectedAvail = 30 - afterDecrease.reserved_quantity;

    if (afterDecrease.total_quantity === expectedTotal && afterDecrease.available_quantity === expectedAvail) {
      logTest(
        3,
        'Increase & Decrease Stock',
        true,
        `Increased stock by +15, then decreased by -5. Final Total: ${afterDecrease.total_quantity}, Available: ${afterDecrease.available_quantity}.`
      );
    } else {
      logTest(3, 'Increase & Decrease Stock', false, `Stock calculation error. Expected total ${expectedTotal}, got ${afterDecrease.total_quantity}`);
    }
  } catch (err: any) {
    logTest(3, 'Increase & Decrease Stock', false, `Error: ${err.message}`);
  }

  // TEST 4: Zero Inventory Handling
  try {
    const zeroItem = await addInventoryItem({
      hospital_id: testHospitalId,
      resource_type: 'Ventilator',
      item_name: 'Portable Transport Ventilator',
      total_quantity: 0,
      unit: 'units',
    });

    if (zeroItem.total_quantity === 0 && zeroItem.reserved_quantity === 0 && zeroItem.available_quantity === 0) {
      logTest(
        4,
        'Zero Inventory',
        true,
        `Successfully created resource with 0 stock (Total: 0, Reserved: 0, Available: 0).`
      );
    } else {
      logTest(4, 'Zero Inventory', false, 'Zero stock item initialization failed.');
    }
  } catch (err: any) {
    logTest(4, 'Zero Inventory', false, `Error: ${err.message}`);
  }

  // TEST 5: Insufficient Inventory & Negative Stock Prevention
  try {
    let errorCaughtCount = 0;

    // Subtest A: Decrease below 0 stock
    try {
      await decreaseStock(bloodItemId, 999);
    } catch (e: any) {
      errorCaughtCount++;
    }

    // Subtest B: Add negative total inventory
    try {
      await addInventoryItem({
        hospital_id: testHospitalId,
        resource_type: 'Medicine',
        item_name: 'Invalid Test Medicine',
        total_quantity: -10,
        unit: 'vials',
      });
    } catch (e: any) {
      errorCaughtCount++;
    }

    // Subtest C: Set reserved > total
    try {
      await updateInventoryItem(icuItemId, {
        total_quantity: 5,
        reserved_quantity: 10,
      });
    } catch (e: any) {
      errorCaughtCount++;
    }

    if (errorCaughtCount === 3) {
      logTest(
        5,
        'Insufficient & Negative Inventory Prevention',
        true,
        `Successfully blocked all 3 invalid operations (decrease below 0, negative stock, reserved > total).`
      );
    } else {
      logTest(
        5,
        'Insufficient & Negative Inventory Prevention',
        false,
        `Failed to block invalid operations. Caught ${errorCaughtCount}/3 expected errors.`
      );
    }
  } catch (err: any) {
    logTest(5, 'Insufficient & Negative Inventory Prevention', false, `Error: ${err.message}`);
  }

  // TEST 6: Reserved Quantity & Available Quantity Formula (available = total - reserved)
  try {
    // Reserve 4 units out of 10 for emergency in icuItemId
    const currentIcu = (await fetchInventory(testHospitalId)).find(i => i.id === icuItemId)!;
    const reservedUpdated = await updateInventoryItem(icuItemId, {
      reserved_quantity: 4,
    });

    const expectedAvail = reservedUpdated.total_quantity - 4;

    if (
      reservedUpdated.reserved_quantity === 4 &&
      reservedUpdated.available_quantity === expectedAvail &&
      reservedUpdated.available_quantity + reservedUpdated.reserved_quantity === reservedUpdated.total_quantity
    ) {
      logTest(
        6,
        'Reserved & Available Quantity Formula',
        true,
        `Reserved 4 units. Verified formula: Available (${reservedUpdated.available_quantity}) = Total (${reservedUpdated.total_quantity}) - Reserved (${reservedUpdated.reserved_quantity}).`
      );
    } else {
      logTest(6, 'Reserved & Available Quantity Formula', false, `Formula check failed. Reserved=${reservedUpdated.reserved_quantity}, Avail=${reservedUpdated.available_quantity}, Total=${reservedUpdated.total_quantity}`);
    }
  } catch (err: any) {
    logTest(6, 'Reserved & Available Quantity Formula', false, `Error: ${err.message}`);
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log('\n----------------------------------------------------------------');
  if (passedCount === results.length) {
    console.log(`✅ ALL ${results.length} PHASE 7 REAL INVENTORY TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.log(`❌ ${results.length - passedCount} OF ${results.length} TESTS FAILED.`);
  }
  console.log('----------------------------------------------------------------\n');
}

runPhase7InventoryTests();
