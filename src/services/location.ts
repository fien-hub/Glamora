// expo-location MUST be required lazily (inside function bodies, not at module
// level) to avoid native module registration crashes in New Architecture builds.
// At bundle-evaluation time, JSI native modules may not yet be registered.
// Calling require() inside an async function ensures it runs after the native
// bridge is fully initialised — matching the same pattern used in locationTracking.ts.
import { Alert, Linking } from 'react-native';

let _Location: typeof import('expo-location') | null = null;

function getExpoLocation(): typeof import('expo-location') | null {
  if (_Location !== null) return _Location;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Location = require('expo-location') as typeof import('expo-location');
    return _Location;
  } catch (e) {
    console.warn('[location.ts] expo-location failed to load:', e);
    return null;
  }
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const KM_TO_MILES = 0.621371;

/**
 * Request location permissions from the user.
 * @param silentDenial - if true, suppresses all Alerts on denial (for background auto-fetches)
 */
export async function requestLocationPermission(silentDenial = false): Promise<boolean> {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('[location.ts] expo-location module unavailable during permission request.');
    return false;
  }

  try {
    // Check current status before requesting to detect permanent denial.
    const { status: currentStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();

    if (currentStatus === 'granted') return true;

    // Permanently denied — the system won't show a dialog. Direct user to Settings.
    if (!canAskAgain) {
      if (!silentDenial) {
        Alert.alert(
          'Location Access Disabled',
          'Please enable location permission for Glamora in your device Settings to find professionals near you.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return false;
    }

    // Ask the system (will show the native permission dialog).
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      if (!silentDenial) {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find beauty professionals near you.'
        );
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Get the user's current location.
 * @param silent - if true, suppresses permission alerts (use for background auto-fetches)
 */
export async function getCurrentLocation(silent = false): Promise<LocationCoords | null> {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('[location.ts] expo-location module unavailable during getCurrentLocation.');
    if (!silent) {
      Alert.alert(
        'Location Unavailable',
        'Location services are currently unavailable in this build. Please enter your address manually.'
      );
    }
    return null;
  }

  try {
    const hasPermission = await requestLocationPermission(silent);
    if (!hasPermission) return null;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      if (!silent) {
        Alert.alert(
          'Location Services Off',
          'Please turn on Location Services in your device settings, then try again.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
      return null;
    }

    // Try last-known position first. A stale-but-valid fix is better than failing.
    let position = await Location.getLastKnownPositionAsync({
      maxAge: 24 * 60 * 60 * 1000,
      requiredAccuracy: 1000,
    });

    if (!position) {
      try {
        // First attempt: balanced accuracy with longer timeout for cold GPS starts.
        position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout after 20s (balanced)')), 20_000)
          ),
        ]);
      } catch (firstError) {
        console.warn('[location.ts] Balanced accuracy location attempt failed:', firstError);

        // Second attempt: lower accuracy fallback often succeeds indoors.
        position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout after 20s (low)')), 20_000)
          ),
        ]);
      }
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    if (!silent) {
      Alert.alert(
        'Could Not Get Location',
        'We could not get a GPS fix. Please move to an open area, ensure Location Services are on, and try again.'
      );
    }
    return null;
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<LocationCoords | null> {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('[location.ts] expo-location module unavailable during geocodeAddress.');
    return null;
  }

  try {
    const results = await Location.geocodeAsync(address);
    
    if (results.length === 0) {
      return null;
    }

    return {
      latitude: results[0].latitude,
      longitude: results[0].longitude,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(coords: LocationCoords): Promise<Address | null> {
  const Location = getExpoLocation();
  if (!Location) {
    console.warn('[location.ts] expo-location module unavailable during reverseGeocode.');
    return null;
  }

  try {
    const results = await Location.reverseGeocodeAsync(coords);
    
    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    return {
      street: result.street || '',
      city: result.city || '',
      state: result.region || '',
      zipCode: result.postalCode || '',
      country: result.country || '',
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 * Uses the Haversine formula
 */
export function calculateDistance(
  coord1: LocationCoords,
  coord2: LocationCoords
): number {
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

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  return formatTravelTimeDistance(distanceKm);
}

const estimateDrivingMinutes = (distanceMiles: number): number => {
  if (distanceMiles <= 0) return 1;
  if (distanceMiles < 1) return Math.max(2, Math.round(distanceMiles * 6));
  if (distanceMiles < 5) return Math.round(4 + distanceMiles * 3);
  if (distanceMiles < 20) return Math.round(10 + distanceMiles * 2);
  return Math.round(30 + distanceMiles * 1.4);
};

const formatMinutesAway = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min away`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr away`;
  }

  return `${hours} hr ${remainingMinutes} min away`;
};

const formatMilesLabel = (distanceMiles: number): string => {
  if (distanceMiles < 0.1) return '0.1 mi';
  if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi`;
  return `${Math.round(distanceMiles)} mi`;
};

export function formatTravelTimeDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 'N/A';
  }

  const distanceMiles = Math.max(0, distanceKm * KM_TO_MILES);
  const etaMinutes = estimateDrivingMinutes(distanceMiles);

  return `${formatMinutesAway(etaMinutes)} · ${formatMilesLabel(distanceMiles)}`;
}

/**
 * Legacy metric-only formatter kept for screens that still need km.
 */
export function formatDistanceMetric(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
}

/**
 * Check if a location is within a service radius
 */
export function isWithinServiceRadius(
  customerLocation: LocationCoords,
  providerLocation: LocationCoords,
  serviceRadiusKm: number
): boolean {
  const distance = calculateDistance(customerLocation, providerLocation);
  return distance <= serviceRadiusKm;
}

/**
 * Get providers within service radius
 */
export function filterProvidersByDistance(
  customerLocation: LocationCoords,
  providers: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
    service_radius_km: number;
  }>
): Array<{ id: string; distance: number }> {
  return providers
    .filter((provider) => {
      if (!provider.latitude || !provider.longitude) {
        return false;
      }

      const providerLocation = {
        latitude: provider.latitude,
        longitude: provider.longitude,
      };

      return isWithinServiceRadius(
        customerLocation,
        providerLocation,
        provider.service_radius_km
      );
    })
    .map((provider) => ({
      id: provider.id,
      distance: calculateDistance(customerLocation, {
        latitude: provider.latitude!,
        longitude: provider.longitude!,
      }),
    }))
    .sort((a, b) => a.distance - b.distance);
}

