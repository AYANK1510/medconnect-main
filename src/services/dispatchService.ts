import { dbEngine } from '../lib/dbEngine';
import type { Dispatch, DispatchStatus } from '../types/database.types';
import { notifyDispatchEvent } from './notificationService';

export async function fetchDispatches(): Promise<Dispatch[]> {
  return dbEngine.getDispatches();
}

export async function fetchDispatchByIdentifier(idOrCode: string): Promise<Dispatch | undefined> {
  return dbEngine.getDispatchByCodeOrId(idOrCode);
}

export async function updateDispatchStatus(
  dispatchId: string,
  newStatus: DispatchStatus,
  userId?: string,
  hospitalId?: string
): Promise<Dispatch> {
  const updated = dbEngine.updateDispatchStatus(dispatchId, newStatus, userId, hospitalId);

  let eventType: 'CREATED' | 'RECEIVED' | 'COMPLETED' | undefined;
  if (newStatus === 'DISPATCH_CREATED' || newStatus === 'CREATED') eventType = 'CREATED';
  if (newStatus === 'RECEIVED' || newStatus === 'DELIVERED') eventType = 'RECEIVED';
  if (newStatus === 'COMPLETED') eventType = 'COMPLETED';

  if (eventType) {
    const srcHosp = dbEngine.getHospitals().find(h => h.id === updated.source_hospital_id);
    const destHosp = dbEngine.getHospitals().find(h => h.id === updated.destination_hospital_id);

    await notifyDispatchEvent(eventType, {
      dispatchId: updated.id,
      requestId: updated.request_id,
      sourceHospitalName: srcHosp?.name,
      destHospitalName: destHosp?.name,
      resourceType: updated.resource_type,
      quantity: updated.quantity,
      verificationCode: updated.verification_code,
    });
  }

  return updated;
}
