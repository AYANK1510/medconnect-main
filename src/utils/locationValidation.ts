/**
 * Location Validation Utility for MedConnect Pulse
 * Enforces strict coordinate boundaries and rules for hospital & patient locations.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  formattedLat?: number;
  formattedLng?: number;
}

/**
 * Validates latitude and longitude coordinates.
 * Rules:
 * - Latitude must be between -90 and +90
 * - Longitude must be between -180 and +180
 * - Coordinates cannot be NaN or null
 * - Coordinates cannot be 0.0000, 0.0000 (accidental uninitialized default)
 */
export function validateCoordinates(
  latInput: number | string | null | undefined,
  lngInput: number | string | null | undefined
): ValidationResult {
  if (latInput === null || latInput === undefined || lngInput === null || lngInput === undefined) {
    return { isValid: false, error: 'Latitude and Longitude coordinates are required.' };
  }

  const lat = typeof latInput === 'number' ? latInput : parseFloat(latInput);
  const lng = typeof lngInput === 'number' ? lngInput : parseFloat(lngInput);

  if (isNaN(lat)) {
    return { isValid: false, error: 'Invalid Latitude value. Must be a valid decimal number.' };
  }

  if (isNaN(lng)) {
    return { isValid: false, error: 'Invalid Longitude value. Must be a valid decimal number.' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and +90 degrees.' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and +180 degrees.' };
  }

  // Reject accidental 0,0 default coordinates (middle of the ocean)
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
    return {
      isValid: false,
      error: 'Coordinates cannot be 0,0. Please select a valid physical location or use browser GPS.',
    };
  }

  return {
    isValid: true,
    formattedLat: Number(lat.toFixed(6)),
    formattedLng: Number(lng.toFixed(6)),
  };
}

/**
 * Helper to get current device position via Browser Geolocation API
 */
export function getCurrentBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser geolocation is not supported by your device or browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      (error) => {
        let msg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Geolocation permission denied. Please allow location access or enter coordinates manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information unavailable. Please enter location manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please enter location manually.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
