/**
 * MedConnect Pulse Phase 16 - Input Validation & Zod Schemas
 */

import { z } from 'zod';
import { createStructuredError } from './errors';
import type { StructuredErrorResponse } from './errors';

// 1. Location Schema
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90).refine((val) => val !== 0, { message: 'Latitude cannot be 0.0' }),
  lng: z.number().min(-180).max(180).refine((val) => val !== 0, { message: 'Longitude cannot be 0.0' }),
});

// 2. Auth Input Schema
export const AuthInputSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  role: z.enum(['patient', 'receptionist', 'er_staff', 'hospital_admin']),
  hospitalId: z.string().optional(),
});

// 3. Appointment Input Schema
export const AppointmentInputSchema = z.object({
  patientName: z.string().min(2, 'Patient name is required.'),
  patientPhone: z.string().min(8, 'Valid patient phone number is required.'),
  hospitalId: z.string().min(1, 'Hospital ID is required.'),
  doctorId: z.string().min(1, 'Doctor ID is required.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  timeSlot: z.string().min(1, 'Time slot is required.'),
});

// 4. Inventory Input Schema
export const InventoryInputSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital ID is required.'),
  resourceType: z.string().min(1, 'Resource type is required.'),
  itemName: z.string().min(2, 'Item name is required.'),
  totalQuantity: z.number().min(0, 'Total quantity cannot be negative.'),
  reservedQuantity: z.number().min(0, 'Reserved quantity cannot be negative.').default(0),
}).refine((data) => data.reservedQuantity <= data.totalQuantity, {
  message: 'Reserved quantity cannot exceed total quantity.',
  path: ['reservedQuantity'],
});

// 5. Emergency Request Schema
export const EmergencyRequestSchema = z.object({
  requestingHospitalId: z.string().min(1, 'Requesting hospital ID is required.'),
  resourceType: z.string().min(1, 'Resource type is required.'),
  quantity: z.number().positive('Quantity must be greater than zero.'),
  urgency: z.enum(['critical', 'high', 'normal', 'CRITICAL', 'HIGH', 'NORMAL', 'medium', 'MEDIUM', 'MODERATE', 'moderate']),
  requestingLat: z.number().min(-90).max(90).refine((val) => val !== 0, { message: 'Latitude invalid' }),
  requestingLng: z.number().min(-180).max(180).refine((val) => val !== 0, { message: 'Longitude invalid' }),
});

// 6. Webhook Headers Schema
export const WebhookHeadersSchema = z.object({
  'x-webhook-secret': z.string().optional(),
  'x-api-key': z.string().optional(),
  'authorization': z.string().optional(),
  'x-twilio-signature': z.string().optional(),
}).passthrough();

// 7. Telegram Callback Query Schema
export const TelegramCallbackSchema = z.object({
  callback_query_id: z.string().min(1),
  data: z.string().min(1),
  from_id: z.number().optional(),
});

// 8. Twilio Webhook Schema
export const TwilioWebhookSchema = z.object({
  CallSid: z.string().min(1),
  From: z.string().min(1),
  To: z.string().min(1),
  CallStatus: z.string().optional(),
});

// 9. QR Pass Verification Schema
export const QRPassVerificationSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required.'),
  qrPassCode: z.string().min(6, 'QR Passcode must be at least 6 characters.'),
  timestamp: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

/**
 * Validates generic payload against a Zod schema
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | StructuredErrorResponse {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation error.';
    return createStructuredError('INVALID_INPUT', `Zod Validation Error: ${message}`);
  }
  return { success: true, data: result.data };
}
