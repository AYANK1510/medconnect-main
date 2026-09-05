import QRCode from 'qrcode';
import { QRPassVerificationSchema, validateInput } from '../utils/validation';
import { AppError } from '../utils/errors';
import { dbEngine } from '../lib/dbEngine';

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><text x="20" y="100" fill="%2306b6d4" font-family="sans-serif">QR DISPATCH PASS</text></svg>';
  }
}

export function verifyQRPass(payload: { requestId: string; qrPassCode: string; timestamp: string }, isExpired: boolean = false): boolean {
  const validation = validateInput(QRPassVerificationSchema, payload);
  if (!validation.success) {
    throw new AppError('INVALID_QR_PASS', validation.error.message);
  }

  if (isExpired) {
    throw new AppError('EXPIRED_EMERGENCY_REQUEST', 'QR pass failed verification: associated emergency request has expired.');
  }

  return true;
}

export async function verifyDispatchQRCode(dispatchId: string): Promise<{
  valid: boolean;
  status?: string;
  error?: string;
  message: string;
  dispatch?: any;
}> {
  const dispatch = dbEngine.getDispatchByCodeOrId(dispatchId);

  if (!dispatch) {
    return {
      valid: false,
      error: 'INVALID_DISPATCH',
      message: `Dispatch record not found for ID: ${dispatchId}`,
    };
  }

  if (dispatch.status === 'CANCELLED') {
    return {
      valid: false,
      status: 'CANCELLED',
      error: 'CANCELLED_DISPATCH',
      message: 'Dispatch has been cancelled. QR pass is invalid.',
      dispatch,
    };
  }

  if (dispatch.status === 'COMPLETED') {
    return {
      valid: false,
      status: 'COMPLETED',
      error: 'COMPLETED_DISPATCH',
      message: 'Dispatch has already been completed.',
      dispatch,
    };
  }

  return {
    valid: true,
    status: dispatch.status,
    message: `Dispatch QR verified successfully. Current status: ${dispatch.status}`,
    dispatch,
  };
}


