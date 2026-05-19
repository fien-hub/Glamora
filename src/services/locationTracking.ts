import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';
import { getCurrentLocation, LocationCoords } from './location';

class LocationTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null;
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
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      // For providers, also request background permissions for continuous tracking
      if (this.userRole === 'provider') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('[LocationTracking] Background permission denied for provider');
          // Still return true for foreground tracking
        }
      }

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
      // Start watching location with appropriate settings
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
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
        .single();

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
