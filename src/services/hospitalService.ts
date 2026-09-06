import { dbEngine } from '../lib/dbEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateDistanceKm } from './geoService';
import type { Hospital as DbHospital } from '../types/database.types';
import type { Hospital as UiHospital, BloodGroup } from '../types';

export interface RegisterHospitalInput {
  name: string;
  code?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergency_contact?: string;
  icuBedsAvailable?: number;
  icuBedsTotal?: number;
  oxygenUnitsAvailable?: number;
  oxygenUnitsTotal?: number;
  bloodInventory?: Partial<Record<BloodGroup, number>>;
}

export interface RegisterHospitalResult {
  dbHospital: DbHospital;
  uiHospital: UiHospital;
  distanceKm: number;
}

/**
 * Validates that hospital GPS coordinates are strictly within the configured network radius
 * (default 15.0 km from network reference center: Metro City General Hospital at 28.6139, 77.2090)
 */
export function validateHospitalRadius(
  latitude: number,
  longitude: number,
  baseHospitalId?: string,
  maxRadiusKm: number = 15.0
): { isValid: boolean; distanceKm: number; error?: string } {
  if (
    latitude === undefined || longitude === undefined ||
    isNaN(latitude) || isNaN(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return {
      isValid: false,
      distanceKm: 0,
      error: 'Invalid GPS coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.'
    };
  }

  // Base hospital center coordinates
  const hospitals = dbEngine.getHospitals();
  const baseHospital = baseHospitalId
    ? hospitals.find(h => h.id === baseHospitalId)
    : hospitals.find(h => h.id === 'hosp-101') || hospitals[0];

  const baseLat = baseHospital?.latitude ?? (baseHospital as any)?.lat ?? 28.6139;
  const baseLng = baseHospital?.longitude ?? (baseHospital as any)?.lng ?? 77.2090;

  const distanceKm = calculateDistanceKm(baseLat, baseLng, latitude, longitude);

  if (distanceKm > maxRadiusKm) {
    return {
      isValid: false,
      distanceKm,
      error: `Hospital is outside the allowed ${maxRadiusKm} km emergency network radius (calculated distance: ${distanceKm} km from center). Cannot register.`
    };
  }

  return { isValid: true, distanceKm };
}

/**
 * Checks for duplicates by name or near-identical GPS location (< 50 meters)
 */
export function checkDuplicateHospital(
  name: string,
  latitude: number,
  longitude: number,
  code?: string
): { isDuplicate: boolean; reason?: string } {
  const existingHospitals = dbEngine.getHospitals();
  const normalizedName = name.trim().toLowerCase();

  for (const hosp of existingHospitals) {
    // 1. Name check
    if (hosp.name.trim().toLowerCase() === normalizedName) {
      return {
        isDuplicate: true,
        reason: `Duplicate Hospital: A hospital named "${hosp.name}" is already registered in the network.`
      };
    }

    // 2. Code check
    if (code && hosp.code && hosp.code.trim().toUpperCase() === code.trim().toUpperCase()) {
      return {
        isDuplicate: true,
        reason: `Duplicate Code: Hospital code "${code.toUpperCase()}" is already assigned to ${hosp.name}.`
      };
    }

    // 3. Location proximity check (< 50 meters)
    const hLat = hosp.latitude ?? (hosp as any).lat;
    const hLng = hosp.longitude ?? (hosp as any).lng;
    if (hLat !== undefined && hLng !== undefined) {
      try {
        const dist = calculateDistanceKm(hLat, hLng, latitude, longitude);
        if (dist < 0.05) {
          return {
            isDuplicate: true,
            reason: `Duplicate Location: Another hospital (${hosp.name}) is already registered at these exact coordinates.`
          };
        }
      } catch {}
    }
  }

  return { isDuplicate: false };
}

/**
 * Registers a new hospital in the network with radius validation and duplicate prevention.
 */
export async function registerNetworkHospital(input: RegisterHospitalInput): Promise<RegisterHospitalResult> {
  // 1. Validate required fields
  if (!input.name || !input.name.trim()) {
    throw new Error('Hospital name is required.');
  }
  if (!input.address || !input.address.trim()) {
    throw new Error('Hospital address is required.');
  }
  if (!input.phone || !input.phone.trim()) {
    throw new Error('Hospital contact phone is required.');
  }

  // 2. Validate radius constraint
  const radiusCheck = validateHospitalRadius(input.latitude, input.longitude);
  if (!radiusCheck.isValid) {
    throw new Error(radiusCheck.error || 'Hospital exceeds allowable network radius.');
  }

  // 3. Check for duplicates
  const dupCheck = checkDuplicateHospital(input.name, input.latitude, input.longitude, input.code);
  if (dupCheck.isDuplicate) {
    throw new Error(dupCheck.reason || 'Hospital is already registered.');
  }

  // 4. Generate unique ID & code
  const hospCode = input.code?.trim().toUpperCase() ||
    `HOSP-${input.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'NET'}`;
  const hospId = `hosp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // 5. Add to dbEngine
  const dbHospital = dbEngine.addOrUpdateHospital({
    id: hospId,
    name: input.name.trim(),
    code: hospCode,
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    lat: input.latitude,
    lng: input.longitude,
    phone: input.phone.trim(),
    emergency_contact: input.emergency_contact?.trim() || input.phone.trim(),
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  // 6. Provision initial inventory in dbEngine so the new hospital can supply emergency dispatches
  const icuAvailable = Math.max(0, input.icuBedsAvailable ?? 4);
  const icuTotal = Math.max(icuAvailable, input.icuBedsTotal ?? 6);
  const oxygenAvailable = Math.max(0, input.oxygenUnitsAvailable ?? 12);
  const oxygenTotal = Math.max(oxygenAvailable, input.oxygenUnitsTotal ?? 20);
  const bloodONeg = Math.max(0, input.bloodInventory?.['O-'] ?? 8);

  dbEngine.addInventoryItem({
    hospital_id: hospId,
    resource_type: 'ICU Bed',
    item_name: 'ICU Beds with Ventilator',
    total_quantity: icuTotal,
    reserved_quantity: Math.max(0, icuTotal - icuAvailable),
    unit: 'beds',
  });

  dbEngine.addInventoryItem({
    hospital_id: hospId,
    resource_type: 'Oxygen',
    item_name: 'Medical Oxygen Cylinders',
    total_quantity: oxygenTotal,
    reserved_quantity: Math.max(0, oxygenTotal - oxygenAvailable),
    unit: 'cylinders',
  });

  dbEngine.addInventoryItem({
    hospital_id: hospId,
    resource_type: 'Blood',
    item_name: 'O- Negative Blood',
    subtype: 'O-',
    total_quantity: bloodONeg,
    reserved_quantity: 0,
    unit: 'units',
  });

  // 7. Sync to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase.from('hospitals').insert([{
        id: hospId,
        name: dbHospital.name,
        address: dbHospital.address,
        latitude: dbHospital.latitude,
        longitude: dbHospital.longitude,
        phone: dbHospital.phone,
        emergency_contact: dbHospital.emergency_contact,
        is_active: true,
      }]);
    } catch (sbErr) {
      console.warn('[hospitalService] Supabase insert non-blocking sync warning:', sbErr);
    }
  }

  // 8. Build UI Hospital representation for AppContext
  const uiHospital: UiHospital = {
    id: hospId,
    name: dbHospital.name,
    code: hospCode,
    address: dbHospital.address,
    lat: input.latitude,
    lng: input.longitude,
    latitude: input.latitude,
    longitude: input.longitude,
    phone: dbHospital.phone || input.phone,
    distanceKm: radiusCheck.distanceKm,
    icuBedsAvailable: icuAvailable,
    icuBedsTotal: icuTotal,
    oxygenUnitsAvailable: oxygenAvailable,
    oxygenUnitsTotal: oxygenTotal,
    bloodInventory: {
      'A+': input.bloodInventory?.['A+'] ?? 10,
      'A-': input.bloodInventory?.['A-'] ?? 4,
      'B+': input.bloodInventory?.['B+'] ?? 12,
      'B-': input.bloodInventory?.['B-'] ?? 3,
      'AB+': input.bloodInventory?.['AB+'] ?? 6,
      'AB-': input.bloodInventory?.['AB-'] ?? 2,
      'O+': input.bloodInventory?.['O+'] ?? 16,
      'O-': bloodONeg,
    },
    status: 'operational',
  };

  return {
    dbHospital,
    uiHospital,
    distanceKm: radiusCheck.distanceKm,
  };
}
