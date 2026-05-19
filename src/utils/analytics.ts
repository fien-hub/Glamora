/**
 * Mixpanel is NOT imported at the top level.
 *
 * mixpanel-react-native calls requireNativeModule('MixpanelReactNative') at
 * module evaluation time. In React Native 0.81 + New Architecture (TurboModules)
 * builds this throws if the TurboModule registry is not yet ready, which would
 * crash every file that transitively imports this module — including AuthContext
 * — preventing SplashScreen.hideAsync() from ever running.
 *
 * Fix: require('mixpanel-react-native') lazily inside initialize() where we
 * know we are already past the initial render and inside a user gesture /
 * deferred effect.
 */
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// metaAds is required lazily to prevent module-level crashes.
// expo-tracking-transparency (imported by metaAds at the top level) can
// throw in New Architecture builds when the TurboModule registry isn't ready.
type MetaAdsModule = typeof import('../services/metaAds');
let _metaAds: MetaAdsModule | null = null;
function getMetaAds(): MetaAdsModule | null {
  if (_metaAds) return _metaAds;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _metaAds = require('../services/metaAds') as MetaAdsModule;
    return _metaAds;
  } catch (e) {
    console.warn('[analytics] metaAds failed to load:', e);
    return null;
  }
}

// Analytics provider type
type AnalyticsProvider = 'mixpanel' | 'amplitude' | 'custom';

// Event properties type
interface EventProperties {
  [key: string]: any;
}

// User properties type
interface UserProperties {
  userId?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

const normalizeCurrencyAmount = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return amount > 1000 ? amount / 100 : amount;
};

class AnalyticsService {
  // typed as `any` to avoid importing Mixpanel at module level (see file header)
  private mixpanel: any = null;
  private initialized = false;
  private provider: AnalyticsProvider = 'mixpanel';
  private enableLogging = __DEV__; // Enable logging in development

  /**
   * Initialize analytics service
   */
  async initialize(token?: string, provider: AnalyticsProvider = 'mixpanel') {
    if (this.initialized) {
      console.log('Analytics already initialized');
      return;
    }

    this.provider = provider;

    try {
      if (provider === 'mixpanel') {
        const mixpanelToken = token || process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
        
        if (!mixpanelToken) {
          console.warn('Mixpanel token not provided. Analytics will not be tracked.');
          return;
        }

        // Lazy require — safe to call here because we are inside an async
        // effect that fires after the first render, well past module-eval time.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Mixpanel } = require('mixpanel-react-native') as { Mixpanel: new (token: string, trackAutomaticEvents: boolean) => any };
        this.mixpanel = new Mixpanel(mixpanelToken, true);
        await this.mixpanel.init();
        
        this.initialized = true;
        this.log('Analytics initialized with Mixpanel');
      }
      // Add other providers here (Amplitude, etc.)
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Identify user
   */
  async identifyUser(userId: string, properties?: UserProperties) {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.identify(userId);
        
        if (properties) {
          await this.mixpanel.getPeople().set(properties);
        }

        this.log('User identified:', userId, properties);
      }
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Track event
   */
  async trackEvent(eventName: string, properties?: EventProperties) {
    if (!this.initialized) return;

    try {
      // Add default properties
      const enrichedProperties = {
        ...properties,
        platform: Device.osName,
        deviceModel: Device.modelName,
        appVersion: Constants.expoConfig?.version,
        timestamp: new Date().toISOString(),
      };

      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.track(eventName, enrichedProperties);
        this.log('Event tracked:', eventName, enrichedProperties);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName: string, properties?: EventProperties) {
    await this.trackEvent('Screen View', {
      screenName,
      ...properties,
    });
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: UserProperties) {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.getPeople().set(properties);
        this.log('User properties set:', properties);
      }
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  /**
   * Increment user property
   */
  async incrementUserProperty(property: string, value: number = 1) {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.getPeople().increment(property, value);
        this.log('User property incremented:', property, value);
      }
    } catch (error) {
      console.error('Failed to increment user property:', error);
    }
  }

  /**
   * Track revenue
   */
  async trackRevenue(amount: number, properties?: EventProperties) {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.getPeople().trackCharge(amount, properties || {});
        this.log('Revenue tracked:', amount, properties);
      }
    } catch (error) {
      console.error('Failed to track revenue:', error);
    }
  }

  /**
   * Reset analytics (on logout)
   */
  async reset() {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.reset();
        this.log('Analytics reset');
      }
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  }

  /**
   * Flush events (send immediately)
   */
  async flush() {
    if (!this.initialized) return;

    try {
      if (this.provider === 'mixpanel' && this.mixpanel) {
        await this.mixpanel.flush();
        this.log('Analytics flushed');
      }
    } catch (error) {
      console.error('Failed to flush analytics:', error);
    }
  }

  /**
   * Log to console in development
   */
  private log(...args: any[]) {
    if (this.enableLogging) {
      console.log('[Analytics]', ...args);
    }
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

// Export singleton
export default analytics;

// Export types
export type { EventProperties, UserProperties, AnalyticsProvider };

// Convenience functions for common events
export const trackSignUp = (method: string, role: string) => {
  analytics.trackEvent('Sign Up', { method, role });
  void getMetaAds()?.trackMetaCompleteRegistration(method, role);
};

export const trackSignIn = (method: string) => {
  analytics.trackEvent('Sign In', { method });
};

export const trackSignOut = () => {
  analytics.trackEvent('Sign Out');
};

export const trackBookingCreated = (serviceType: string, price: number, providerId: string) => {
  analytics.trackEvent('Booking Created', {
    serviceType,
    price,
    providerId,
  });
  void getMetaAds()?.trackMetaInitiatedCheckout(normalizeCurrencyAmount(price), {
    serviceType,
    providerId,
  });
};

export const trackBookingCompleted = (bookingId: string, price: number) => {
  analytics.trackEvent('Booking Completed', {
    bookingId,
    price,
  });
};

export const trackBookingCancelled = (bookingId: string, reason?: string) => {
  analytics.trackEvent('Booking Cancelled', {
    bookingId,
    reason,
  });
};

export const trackServiceAdded = (serviceType: string, price: number) => {
  analytics.trackEvent('Service Added', {
    serviceType,
    price,
  });
};

export const trackServiceEdited = (serviceId: string) => {
  analytics.trackEvent('Service Edited', {
    serviceId,
  });
};

export const trackServiceDeleted = (serviceId: string) => {
  analytics.trackEvent('Service Deleted', {
    serviceId,
  });
};

export const trackPaymentSuccess = (amount: number, bookingId: string) => {
  analytics.trackEvent('Payment Success', {
    amount,
    bookingId,
  });
  analytics.trackRevenue(amount, { bookingId });
  void getMetaAds()?.trackMetaPurchase(normalizeCurrencyAmount(amount), 'USD', {
    bookingId,
  });
};

export const trackPaymentFailed = (amount: number, bookingId: string, error: string) => {
  analytics.trackEvent('Payment Failed', {
    amount,
    bookingId,
    error,
  });
};

export const trackSearchPerformed = (query: string, filters: any) => {
  analytics.trackEvent('Search Performed', {
    query,
    filters,
  });
};

export const trackProfileViewed = (profileId: string, profileType: string) => {
  analytics.trackEvent('Profile Viewed', {
    profileId,
    profileType,
  });
};

export const trackProfileEdited = () => {
  analytics.trackEvent('Profile Edited', {});
};

export const trackMessageSent = (recipientId: string, hasAttachment: boolean) => {
  analytics.trackEvent('Message Sent', {
    recipientId,
    hasAttachment,
  });
};

export const trackReviewSubmitted = (rating: number, bookingId: string) => {
  analytics.trackEvent('Review Submitted', {
    rating,
    bookingId,
  });
};

export const trackNotificationOpened = (notificationType: string) => {
  analytics.trackEvent('Notification Opened', {
    notificationType,
  });
};

export const trackFeatureUsed = (featureName: string, context?: any) => {
  analytics.trackEvent('Feature Used', {
    featureName,
    ...context,
  });
};

export const trackError = (errorType: string, errorMessage: string, context?: any) => {
  analytics.trackEvent('Error Occurred', {
    errorType,
    errorMessage,
    ...context,
  });
};

// Recurring Booking Events
export const trackRecurringBookingCreated = (
  frequency: string,
  totalInstances: number,
  totalCost: number,
  serviceType: string,
  providerId: string
) => {
  analytics.trackEvent('Recurring Booking Created', {
    frequency,
    totalInstances,
    totalCost,
    serviceType,
    providerId,
  });
};

export const trackRecurringBookingCancelled = (
  recurringBookingId: string,
  cancelType: 'single' | 'all_future' | 'all',
  remainingInstances?: number
) => {
  analytics.trackEvent('Recurring Booking Cancelled', {
    recurringBookingId,
    cancelType,
    remainingInstances,
  });
};

export const trackRecurringBookingEdited = (
  recurringBookingId: string,
  changedFields: string[]
) => {
  analytics.trackEvent('Recurring Booking Edited', {
    recurringBookingId,
    changedFields,
  });
};

export const trackRecurringBookingViewed = (recurringBookingId: string, totalInstances: number) => {
  analytics.trackEvent('Recurring Booking Viewed', {
    recurringBookingId,
    totalInstances,
  });
};

// Security Events
export const trackSecurityEvent = (
  eventType: string,
  severity: 'info' | 'warning' | 'critical' = 'info',
  metadata?: any
) => {
  analytics.trackEvent('Security Event', {
    eventType,
    severity,
    ...metadata,
  });
};

export const trackLoginAttempt = (success: boolean, method: 'email' | 'google' | 'apple' = 'email') => {
  analytics.trackEvent(success ? 'Login Success' : 'Login Failed', {
    method,
    timestamp: new Date().toISOString(),
  });
};

export const trackPasswordChange = () => {
  analytics.trackEvent('Password Changed', {
    timestamp: new Date().toISOString(),
  });
};

export const trackSessionTimeout = () => {
  analytics.trackEvent('Session Timeout', {
    timestamp: new Date().toISOString(),
  });
};

export const trackSuspiciousActivity = (activityType: string, details?: any) => {
  analytics.trackEvent('Suspicious Activity Detected', {
    activityType,
    severity: 'critical',
    ...details,
  });
};

export const trackAccountLocked = (reason: string) => {
  analytics.trackEvent('Account Locked', {
    reason,
    severity: 'critical',
    timestamp: new Date().toISOString(),
  });
};

// ============================================
// Social Sharing Events
// ============================================

/**
 * Track when content is shared
 */
export const trackContentShared = (
  contentType: 'provider' | 'portfolio' | 'booking' | 'referral',
  platform: 'general' | 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'sms' | 'email' | 'copy',
  contentId?: string,
  metadata?: any
) => {
  analytics.trackEvent('Content Shared', {
    content_type: contentType,
    platform,
    content_id: contentId,
    ...metadata,
  });
};

/**
 * Track when a provider profile is shared
 */
export const trackProviderShared = (
  providerId: string,
  platform: 'general' | 'whatsapp' | 'facebook' | 'twitter' | 'sms' | 'copy',
  hasReferralCode: boolean = false
) => {
  analytics.trackEvent('Provider Shared', {
    provider_id: providerId,
    platform,
    has_referral_code: hasReferralCode,
  });
};

/**
 * Track when a portfolio item is shared
 */
export const trackPortfolioShared = (
  portfolioImageId: string,
  providerId: string,
  platform: 'image' | 'whatsapp' | 'facebook' | 'twitter' | 'copy' | 'general'
) => {
  analytics.trackEvent('Portfolio Shared', {
    portfolio_image_id: portfolioImageId,
    provider_id: providerId,
    platform,
  });
};

/**
 * Track when a booking is shared
 */
export const trackBookingShared = (
  bookingId: string,
  platform: 'whatsapp' | 'sms' | 'general',
  bookingStatus?: string
) => {
  analytics.trackEvent('Booking Shared', {
    booking_id: bookingId,
    platform,
    booking_status: bookingStatus,
  });
};

/**
 * Track when a referral code is copied
 */
export const trackReferralCodeCopied = (referralCode: string) => {
  analytics.trackEvent('Referral Code Copied', {
    referral_code: referralCode,
  });
};
