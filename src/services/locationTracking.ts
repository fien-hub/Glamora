// expo-location is required lazily to avoid module-level native module
// crashes in New Architecture builds. All Location usage is inside async
// methods that run well after the app has rendered.
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import { getCurrentLocation, LocationCoords } from './location';

let _Location: typeof import('expo-location') | null = null;
let _LocationLoadPromise: Promise<typeof import('expo-location') | null> | null = null;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function getLocationSync(): typeof import('expo-location') | null {
  if (_Location !== null) return _Location;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Location = require('expo-location') as typeof import('expo-location');
    return _Location;
  } catch (e) {
    console.warn('[locationTracking] expo-location failed to load:', e);
    return null;
  }
}

async function getLocation(): Promise<typeof import('expo-location') | null> {
  if (_Location) return _Location;
  if (_LocationLoadPromise) return _LocationLoadPromise;

  _LocationLoadPromise = (async () => {
    const maxAttempts = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const syncLocation = getLocationSync();
      if (syncLocation) return syncLocation;

      try {
        const dynamicLocation = (await import('expo-location')) as typeof import('expo-location');
        _Location = dynamicLocation;
        return _Location;
      } catch (error) {
        lastError = error;
      }

      if (attempt < maxAttempts) {
        await wait(250 * attempt);
      }
    }

    console.warn('[locationTracking] expo-location unavailable after retries:', lastError);
    return null;
  })();

  const loaded = await _LocationLoadPromise;
  _LocationLoadPromise = null;
  return loaded;
}

class LocationTrackingService {
  private locationSubscription: any = null;
  private isTracking: boolean = false;
  private userId: string | null = null;
  private userRole: 'customer' | 'provider' | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes
  private appStateSubscription: any = null;

  /**
   * Initialize location tracking for a user
   */
  async initialize(userId: string, userRole: 'customer' | 'provider') {
    this.userId = userId;
    this.userRole = userRole;

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('[LocationTracking] Permission denied, cannot track location');
      return;
    }

    // Get and save initial location
    await this.updateLocationNow();

    // Start background tracking
    await this.startTracking();

    // Monitor app state changes
    this.setupAppStateListener();

    console.log('[LocationTracking] Initialized for user:', userId);
  }

  /**
   * Request location permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permissions
      const Loc = await getLocation();
      if (!Loc) return false;

      const { status: foregroundStatus } = await Loc.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      // Foreground permission is enough for in-app tracking and location buttons.
      // Avoid background permission prompts in production unless explicitly needed.

      return true;
    } catch (error) {
      console.error('[LocationTracking] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Start background location tracking
   */
  private async startTracking() {
    if (this.isTracking) return;

    try {
      const Loc = await getLocation();
      if (!Loc) return;
      // Start watching location with appropriate settings
      this.locationSubscription = await Loc.watchPositionAsync(
        {
          accuracy: Loc.Accuracy.Balanced,
          timeInterval: this.updateInterval,
          distanceInterval: 100, // Update if user moves 100 meters
        },
        async (location) => {
          await this.handleLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );

      this.isTracking = true;
      console.log('[LocationTracking] Started tracking');
    } catch (error) {
      console.error('[LocationTracking] Error starting tracking:', error);
    }
  }

  /**
   * Handle location update
   */
  private async handleLocationUpdate(coords: LocationCoords) {
    const now = Date.now();

    // Rate limit updates to avoid excessive database writes
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    this.lastUpdateTime = now;
    await this.saveLocation(coords);
  }

  /**
   * Update location immediately
   */
  async updateLocationNow() {
    try {
      const location = await getCurrentLocation();
      if (location) {
        await this.saveLocation(location);
      }
    } catch (error) {
      console.error('[LocationTracking] Error updating location now:', error);
    }
  }

  /**
   * Save location to database
   */
  private async saveLocation(coords: LocationCoords) {
    if (!this.userId || !this.userRole) return;

    try {
      const table = this.userRole === 'provider' ? 'provider_profiles' : 'customer_profiles';

      // profiles.id is the foreign key used as the primary key on provider_profiles/customer_profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError || !profile) {
        throw profileError || new Error('Profile not found for current user');
      }

      // Update location by profile id
      const { error } = await supabase
        .from(table)
        .update({
          current_latitude: coords.latitude,
          current_longitude: coords.longitude,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      console.log('[LocationTracking] Location updated:', coords);
    } catch (error) {
      console.error('[LocationTracking] Error saving location:', error);
    }
  }

  /**
   * Setup app state listener
   */
  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, update location
      await this.updateLocationNow();
      
      // Restart tracking if it was stopped
      if (!this.isTracking) {
        await this.startTracking();
      }
    } else if (nextAppState === 'background') {
      // App went to background
      console.log('[LocationTracking] App in background, tracking continues');
    }
  };

  /**
   * Stop location tracking
   */
  async stop() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isTracking = false;
    this.userId = null;
    this.userRole = null;

    console.log('[LocationTracking] Stopped tracking');
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isTracking;
  }
}

// Export singleton instance
export const locationTrackingService = new LocationTrackingService();
