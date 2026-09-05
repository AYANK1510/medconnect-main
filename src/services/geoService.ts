/**
 * Server-side Haversine distance calculation in kilometers
 * Earth Radius = 6371 KM
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
  ) {
    throw new Error('Invalid hospital location coordinates.');
  }

  // Latitude range [-90, 90], Longitude range [-180, 180]
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    throw new Error('Invalid hospital location coordinates.');
  }

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
}

/**
 * Filters and ranks regional hospitals within a specified geo-fence radius (e.g. 15 km)
 */
export function filterHospitalsWithinRadius(
  requestingLat: number,
  requestingLng: number,
  hospitals: any[],
  maxRadiusKm: number = 15.0
): (any & { distanceKm: number })[] {
  return hospitals
    .map((hospital) => {
      const distanceKm = calculateDistanceKm(
        requestingLat,
        requestingLng,
        hospital.lat ?? hospital.latitude ?? 0,
        hospital.lng ?? hospital.longitude ?? 0
      );
      return {
        ...hospital,
        distanceKm,
      };
    })
    .filter((hospital) => hospital.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
