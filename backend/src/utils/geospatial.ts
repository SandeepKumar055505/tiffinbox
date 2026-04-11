/**
 * Sovereign Geospatial Utilities (Ω.4)
 * Orchestrating distance-based governance with high-fidelity Haversine logic.
 */

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates in Kilometers.
 * Haversine formula manifestation.
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in KM
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Re-verify geofence for a user's address update.
 * Checks against the kitchen coordinates in app_settings.
 */
export async function verifyGeofence(db: any, address: { lat: number, lng: number }): Promise<boolean> {
  const settings = await db('app_settings').where({ id: 1 }).first();
  if (!settings) return true; // Default to allow if not configured
  
  const kitchen = {
    lat: parseFloat(settings.kitchen_lat || '12.9716'), // Defaults to Indiranagar center
    lng: parseFloat(settings.kitchen_lng || '77.6412')
  };
  
  const maxDistance = parseFloat(settings.max_delivery_distance || '15');
  const distance = calculateDistance(kitchen, address);
  
  return distance <= maxDistance;
}
