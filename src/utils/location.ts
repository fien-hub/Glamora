// expo-location MUST be required lazily (inside function bodies) to avoid native
// module registration crashes in New Architecture builds. At bundle-evaluation time,
// JSI native modules may not yet be registered.
let _Location: typeof import('expo-location') | null = null;
function getExpoLocation(): typeof import('expo-location') | null {
  if (_Location !== null) return _Location;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Location = require('expo-location') as typeof import('expo-location');
    return _Location;
  } catch (e) {
    console.warn('[utils/location.ts] expo-location failed to load:', e);
    return null;
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('expo-location module is unavailable; skipping foreground permission request.');
    return false;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Get current user location
 */
export const getCurrentLocation = async (): Promise<Coordinates | null> => {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('expo-location module is unavailable; cannot fetch current location.');
    return null;
  }

  try {
    const hasPermission = await requestLocationPermissions();
    
    if (!hasPermission) {
      console.log('Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

/**
 * Check if a location is within a certain radius
 */
export const isWithinRadius = (
  coord1: Coordinates,
  coord2: Coordinates,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(coord1, coord2);
  return distance <= radiusKm;
};

/**
 * Get address from coordinates (reverse geocoding)
 */
export const getAddressFromCoordinates = async (
  coordinates: Coordinates
): Promise<string | null> => {
  try {
    const addresses = await Location.reverseGeocodeAsync(coordinates);
    
    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const parts = [
        address.street,
        address.city,
        address.region,
        address.postalCode,
      ].filter(Boolean);
      
      return parts.join(', ');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting address:', error);
    return null;
  }
};

/**
 * Get coordinates from address (geocoding)
 */
export const getCoordinatesFromAddress = async (
  address: string
): Promise<Coordinates | null> => {
  try {
    const locations = await Location.geocodeAsync(address);
    
    if (locations && locations.length > 0) {
      return {
        latitude: locations[0].latitude,
        longitude: locations[0].longitude,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
};

