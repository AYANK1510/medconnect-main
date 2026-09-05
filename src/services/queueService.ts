import { dbEngine } from '../lib/dbEngine';
import type { QueueToken, QueueStatus } from '../types/database.types';

export async function fetchQueueTokens(hospitalId?: string): Promise<QueueToken[]> {
  return dbEngine.getQueueTokens(hospitalId);
}

export async function updateQueueStatus(tokenId: string, status: QueueStatus): Promise<QueueToken> {
  return dbEngine.updateQueueTokenStatus(tokenId, status);
}

export async function callNextPatient(hospitalId?: string, doctorId?: string): Promise<QueueToken | null> {
  return dbEngine.callNextPatient(hospitalId, doctorId);
}

export async function getPatientQueueMetrics(tokenIdOrApptId: string) {
  return dbEngine.getPatientQueueMetrics(tokenIdOrApptId);
}

export function subscribeToQueueUpdates(callback: () => void) {
  return dbEngine.subscribe(callback);
}
