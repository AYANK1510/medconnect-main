import { dbEngine } from '../lib/dbEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EmergencyRequest, EmergencyMatch, EmergencyUrgency } from '../types/database.types';
import { sendTelegramEmergencyAlert } from './telegramService';
import { notifyEmergencyEvent } from './notificationService';
import { EmergencyRequestSchema, LocationSchema, validateInput } from '../utils/validation';
import { AppError } from '../utils/errors';
import { callN8nEmergencyDispatch } from './n8nRealIntegration';
import { calculateDistanceKm } from './geoService';

export async function createEmergencyRequest(data: {
  requesting_hospital_id: string;
  resource_type: string;
  resource_name?: string;
  quantity: number;
  urgency: EmergencyUrgency;
  notes?: string;
}): Promise<{ request: EmergencyRequest; matches: EmergencyMatch[]; message?: string }> {
  const reqHosp = dbEngine.getHospitals().find(h => h.id === data.requesting_hospital_id);
  if (!reqHosp || reqHosp.is_active === false) {
    throw new AppError('UNAUTHORIZED_HOSPITAL_ACCESS', 'Requesting hospital not found or inactive.');
  }

  // Location Validation
  const locValidation = validateInput(LocationSchema, { lat: reqHosp.latitude, lng: reqHosp.longitude });
  if (!locValidation.success) {
    throw new AppError('INVALID_LOCATION', locValidation.error.message);
  }

  const validation = validateInput(EmergencyRequestSchema, {
    requestingHospitalId: data.requesting_hospital_id,
    resourceType: data.resource_type as any,
    quantity: data.quantity,
    urgency: data.urgency,
    requestingLat: reqHosp.latitude,
    requestingLng: reqHosp.longitude,
  });

  if (!validation.success) {
    throw new AppError('INVALID_INPUT', validation.error.message);
  }

  // Execute via dbEngine which enforces hospital coordinates & Haversine distance
  const localRes = dbEngine.createEmergencyRequest(data);

  // Dispatch notifications & Telegram alerts for authorized supplying hospital matches
  const reqHospName = reqHosp?.name || 'Emergency Hospital';

  if (localRes.matches.length > 0) {
    for (const match of localRes.matches) {
      await sendTelegramEmergencyAlert({
        requestId: localRes.request.id,
        supplyingHospitalId: match.hospital_id,
        emergencyHospital: reqHospName,
        resource: data.resource_name || data.resource_type,
        quantity: data.quantity,
        distanceKm: match.distance_km,
        urgency: data.urgency,
      });

      await notifyEmergencyEvent('MATCH_FOUND', {
        requestId: localRes.request.id,
        hospitalId: data.requesting_hospital_id,
        supplyingHospitalName: match.hospital_name,
        resourceType: data.resource_name || data.resource_type,
        quantity: data.quantity,
        distanceKm: match.distance_km,
      });
    }
  } else {
    // If no pre-matched excess inventory exists, broadcast alert to active network hospitals within 15 km
    const reqLat = reqHosp?.latitude ?? (reqHosp as any)?.lat ?? 28.6139;
    const reqLng = reqHosp?.longitude ?? (reqHosp as any)?.lng ?? 77.2090;

    const nearbyHospitals = dbEngine.getHospitals()
      .filter(h => h.id !== data.requesting_hospital_id && h.is_active !== false)
      .map(h => {
        const hLat = h.latitude ?? (h as any).lat ?? 0;
        const hLng = h.longitude ?? (h as any).lng ?? 0;
        let dist = 4.2;
        try {
          dist = calculateDistanceKm(reqLat, reqLng, hLat, hLng);
        } catch {
          dist = 4.2;
        }
        return { hospital: h, distanceKm: dist };
      })
      .filter(item => item.distanceKm <= 15.0)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Alert the primary supplying hospitals in the 15km geo-fence
    const targetHospitals = nearbyHospitals.length > 0 ? nearbyHospitals.slice(0, 3) : [];
    for (const item of targetHospitals) {
      const match: EmergencyMatch = {
        id: `em-match-${Date.now()}-${item.hospital.id}`,
        request_id: localRes.request.id,
        hospital_id: item.hospital.id,
        hospital_name: item.hospital.name,
        distance_km: item.distanceKm,
        available_quantity: 0,
        status: 'PENDING',
        notified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      dbEngine.addEmergencyMatch(match);
      localRes.matches.push(match);

      await sendTelegramEmergencyAlert({
        requestId: localRes.request.id,
        supplyingHospitalId: item.hospital.id,
        emergencyHospital: reqHospName,
        resource: data.resource_name || data.resource_type,
        quantity: data.quantity,
        distanceKm: item.distanceKm,
        urgency: data.urgency,
      });

      await notifyEmergencyEvent('MATCH_FOUND', {
        requestId: localRes.request.id,
        hospitalId: data.requesting_hospital_id,
        supplyingHospitalName: item.hospital.name,
        resourceType: data.resource_name || data.resource_type,
        quantity: data.quantity,
        distanceKm: item.distanceKm,
      });
    }
  }

  // Trigger Real Local n8n Emergency Dispatch Workflow (wf-emergency-dispatch-v14)
  try {
    await callN8nEmergencyDispatch({
      requesting_hospital_id: data.requesting_hospital_id,
      resource_type: data.resource_type,
      resource_name: data.resource_name,
      quantity: data.quantity,
      urgency: data.urgency,
      notes: data.notes,
    });
  } catch (n8nErr: any) {
    console.warn('[emergencyService] n8n emergency workflow bypassed/unavailable:', n8nErr?.message || n8nErr);
  }

  if (isSupabaseConfigured) {
    try {
      const { data: reqData, error: reqErr } = await supabase
        .from('emergency_requests')
        .insert([{
          requesting_hospital_id: data.requesting_hospital_id,
          resource_type: data.resource_type,
          quantity: data.quantity,
          urgency: data.urgency,
          latitude: localRes.request.latitude,
          longitude: localRes.request.longitude,
          status: 'PENDING',
          notes: data.notes || null,
        }])
        .select()
        .single();

      if (!reqErr && reqData) {
        if (localRes.matches.length > 0) {
          const matchPayloads = localRes.matches.map(m => ({
            request_id: reqData.id,
            hospital_id: m.hospital_id,
            distance_km: m.distance_km,
            status: 'PENDING',
          }));
          await supabase.from('emergency_matches').insert(matchPayloads);
        }
      }
    } catch (err) {
      console.warn('Supabase emergency request sync warning:', err);
    }
  }

  return localRes;
}

export async function fetchEmergencyRequests(): Promise<EmergencyRequest[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('emergency_requests').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetchEmergencyRequests fallback to dbEngine:', err);
    }
  }
  return dbEngine.getEmergencyRequests();
}

export async function acceptEmergencyRequest(requestId: string, hospitalId: string) {
  const reqCheck = dbEngine.getEmergencyRequests().find(r => r.id === requestId);
  if (reqCheck) {
    const isExpired = reqCheck.status === 'EXPIRED' || (reqCheck.expires_at && new Date(reqCheck.expires_at) <= new Date());
    if (isExpired) {
      throw new AppError('EXPIRED_EMERGENCY_REQUEST', 'Emergency request has expired and cannot be accepted.');
    }
  }

  // Use async mutex-protected local execution for concurrency safety
  const localRes = await dbEngine.acceptEmergencyRequestAsync(requestId, hospitalId);

  const req = dbEngine.getEmergencyRequests().find(r => r.id === requestId);
  const suppHosp = dbEngine.getHospitals().find(h => h.id === hospitalId);
  await notifyEmergencyEvent('ACCEPTED', {
    requestId,
    hospitalId: req?.requesting_hospital_id || hospitalId,
    supplyingHospitalName: suppHosp?.name || 'Supplying Hospital',
    resourceType: req?.resource_name || req?.resource_type || localRes.dispatch.resource_type,
    quantity: req?.quantity || localRes.dispatch.quantity,
  });

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('reserve_emergency_inventory', {
        p_request_id: requestId,
        p_responding_hospital_id: hospitalId,
      });
      if (error) {
        console.warn('Supabase reserve_emergency_inventory RPC error:', error);
      }
    } catch (err) {
      console.warn('Supabase acceptEmergencyRequest sync warning:', err);
    }
  }

  return localRes;
}

export async function acceptEmergencyRequestAsync(requestId: string, hospitalId: string) {
  return acceptEmergencyRequest(requestId, hospitalId);
}

export { processEmergencyTimeouts } from './twilioService';

