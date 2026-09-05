/**
 * voiceAiService — thin wrapper that delegates to the real AI Receptionist engine.
 * Supports both text and audio blob input. Uses Sarvam STT → OpenAI Intent → DB Validation pipeline.
 */

import { processReceptionistTurn } from './receptionistService';
import type { ReceptionistResponse } from './receptionistService';

export interface StructuredIntent {
  intent: 'BOOK_APPOINTMENT' | 'CHECK_APPOINTMENT' | 'CHECK_QUEUE' | 'UNKNOWN';
  department_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  date?: string;
  suggested_time?: string;
  available_slots?: string[];
  raw_transcript: string;
  ai_message: string;
  // Full receptionist response for callers that need it
  fullResponse?: ReceptionistResponse;
}

/**
 * Process a voice or text intake through the full AI Receptionist engine.
 * @param audioBlob - Recorded audio blob from browser mic (null → use textPrompt)
 * @param textPrompt - Fallback text prompt when no audio is provided
 * @param hospitalId - Hospital context (defaults to hosp-101)
 * @param language  - Language hint for Sarvam STT + response translation
 */
export async function processVoiceIntake(
  audioBlob: Blob | null,
  textPrompt?: string,
  hospitalId: string = 'hosp-101',
  language: string = 'Hinglish'
): Promise<StructuredIntent> {
  const res = await processReceptionistTurn({
    channel: audioBlob ? 'mic' : 'text',
    text: audioBlob ? undefined : (textPrompt || ''),
    audioBlob: audioBlob ?? undefined,
    language,
    hospitalId,
  });

  return {
    intent: (res.intent === 'BOOK_APPOINTMENT' || res.intent === 'CHECK_APPOINTMENT' || res.intent === 'CHECK_QUEUE')
      ? res.intent
      : 'UNKNOWN',
    department_name: res.validatedSlots?.departmentName,
    doctor_id: res.validatedSlots?.doctorId,
    doctor_name: res.validatedSlots?.doctorName,
    date: res.validatedSlots?.date,
    suggested_time: res.validatedSlots?.timeSlot,
    available_slots: res.actionPayload?.availableSlots,
    raw_transcript: res.transcript,
    ai_message: res.aiMessage,
    fullResponse: res,
  };
}
