/**
 * Haversine distance in kilometres between two lat/lng points.
 * Pure function, no I/O — safe for unit tests.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * True when the event's gym is within `maxKm` of the user's gym.
 * Returns false when either side is missing coordinates.
 */
export function isNearGym(
  event: { gym: { lat: number | null; lng: number | null } | null },
  userGym: { lat: number | null; lng: number | null } | null,
  maxKm: number
): boolean {
  if (!event.gym || !userGym) return false;
  const { lat: eventLat, lng: eventLng } = event.gym;
  if (eventLat == null || eventLng == null || userGym.lat == null || userGym.lng == null) {
    return false;
  }
  return (
    haversineKm(
      { lat: userGym.lat, lng: userGym.lng },
      { lat: eventLat, lng: eventLng }
    ) <= maxKm
  );
}