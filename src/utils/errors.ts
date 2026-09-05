/**
 * MedConnect Pulse Phase 16 - Centralized Error System & Security Standard
 */

export type ErrorCode =
  | 'NETWORK_FAILURE'
  | 'DATABASE_FAILURE'
  | 'AI_FAILURE'
  | 'STT_FAILURE'
  | 'INVALID_LOCATION'
  | 'DOCTOR_UNAVAILABLE'
  | 'INVENTORY_UNAVAILABLE'
  | 'TELEGRAM_FAILURE'
  | 'TWILIO_FAILURE'
  | 'WHATSAPP_FAILURE'
  | 'N8N_FAILURE'
  | 'EXPIRED_EMERGENCY_REQUEST'
  | 'UNAUTHORIZED_ACCESS'
  | 'UNAUTHORIZED_HOSPITAL_ACCESS'
  | 'UNAUTHORIZED_INVENTORY_MODIFICATION'
  | 'INVALID_API_KEY'
  | 'INVALID_WEBHOOK_SIGNATURE'
  | 'INVALID_QR_PASS'
  | 'INVALID_INPUT'
  | 'SQL_INJECTION_RISK'
  | 'AUTHENTICATION_REQUIRED'
  | 'SERVICE_ROLE_EXPOSED';

export interface StructuredError {
  code: ErrorCode;
  message: string;
}

export interface StructuredErrorResponse {
  success: false;
  error: StructuredError;
}

export interface StructuredSuccessResponse<T> {
  success: true;
  data: T;
}

export type StructuredResult<T> = StructuredSuccessResponse<T> | StructuredErrorResponse;

export class AppError extends Error {
  public readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toStructuredError(): StructuredErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

/**
 * Creates a standard Phase 16 structured error object
 */
export function createStructuredError(code: ErrorCode, message: string): StructuredErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

/**
 * Masks sensitive information such as PII phone numbers, API keys, and secret tokens in logs or outputs
 */
export function maskSensitiveData(text: string): string {
  if (!text) return text;
  
  let sanitized = text;

  // Mask OpenAI / secret keys
  sanitized = sanitized.replace(/(sk-[a-zA-Z0-9_-]{8})[a-zA-Z0-9_-]+/g, '$1****');
  sanitized = sanitized.replace(/(bot[0-9]{8,}:)[a-zA-Z0-9_-]+/g, '$1****');

  // Mask Phone numbers: +91-9876543210 -> +91-98****3210
  sanitized = sanitized.replace(/(\+\d{2}-\d{2})\d{4,6}(\d{4})/g, '$1****$2');

  return sanitized;
}
