import { Platform } from 'react-native';
import Constants from 'expo-constants';

// expo-tracking-transparency is required lazily — it calls into a native ATT
// module at module-evaluation time which can throw in New Architecture builds.
type TrackingModule = typeof import('expo-tracking-transparency');
let _tracking: TrackingModule | null = null;
function getTracking(): TrackingModule | null {
  if (_tracking) return _tracking;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _tracking = require('expo-tracking-transparency') as TrackingModule;
    return _tracking;
  } catch (e) {
    console.warn('[metaAds] expo-tracking-transparency failed to load:', e);
    return null;
  }
}

let sdkLoadAttempted = false;
let metaInitialized = false;
let Settings: any = null;
let AppEventsLogger: any = null;

const isExpoGoRuntime = () => {
  const appOwnership = (Constants as any)?.appOwnership;
  const executionEnvironment = (Constants as any)?.executionEnvironment;
  return appOwnership === 'expo' || executionEnvironment === 'storeClient';
};

const hasValidValue = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 0 && !normalized.startsWith('your_') && !normalized.startsWith('YOUR_');
};

const getMetaConfig = () => {
  const appId = process.env.EXPO_PUBLIC_META_APP_ID || '';
  const clientToken = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN || '';

  return {
    appId,
    clientToken,
    isConfigured: hasValidValue(appId) && hasValidValue(clientToken),
  };
};

const loadMetaSdk = async () => {
  if (sdkLoadAttempted) {
    return Boolean(Settings && AppEventsLogger);
  }

  sdkLoadAttempted = true;

  try {
    const module = await import('react-native-fbsdk-next');
    Settings = module.Settings;
    AppEventsLogger = module.AppEventsLogger;
    return Boolean(Settings && AppEventsLogger);
  } catch (error) {
    if (__DEV__) {
      console.warn('[MetaAds] SDK not available in this runtime. Use a native dev build for Meta attribution.');
    }
    return false;
  }
};

export const initializeMetaAdsTracking = async () => {
  if (metaInitialized || Platform.OS === 'web') {
    return;
  }

  if (isExpoGoRuntime()) {
    if (__DEV__) {
      console.warn('[MetaAds] Skipping Meta SDK in Expo Go. Use a development build for native Meta attribution.');
    }
    return;
  }

  const config = getMetaConfig();
  if (!config.isConfigured) {
    if (__DEV__) {
      console.warn('[MetaAds] Missing EXPO_PUBLIC_META_APP_ID or EXPO_PUBLIC_META_CLIENT_TOKEN');
    }
    return;
  }

  const sdkAvailable = await loadMetaSdk();
  if (!sdkAvailable) {
    return;
  }

  try {
    if (typeof Settings.setAppID === 'function') {
      Settings.setAppID(config.appId);
    }

    if (typeof Settings.setClientToken === 'function') {
      Settings.setClientToken(config.clientToken);
    }

    if (typeof Settings.setAutoLogAppEventsEnabled === 'function') {
      Settings.setAutoLogAppEventsEnabled(true);
    }

    if (typeof Settings.setAdvertiserIDCollectionEnabled === 'function') {
      Settings.setAdvertiserIDCollectionEnabled(true);
    }

    if (Platform.OS === 'ios') {
      try {
        const tracking = getTracking();
        if (!tracking) return;
        const current = await tracking.getTrackingPermissionsAsync();
        const permission =
          current.status === 'undetermined'
            ? await tracking.requestTrackingPermissionsAsync()
            : current;

        if (typeof Settings.setAdvertiserTrackingEnabled === 'function') {
          Settings.setAdvertiserTrackingEnabled(permission.status === 'granted');
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[MetaAds] Tracking permission request failed:', error);
        }
      }
    }

    if (typeof Settings.initializeSDK === 'function') {
      Settings.initializeSDK();
    }

    if (typeof AppEventsLogger.activateApp === 'function') {
      AppEventsLogger.activateApp();
    }

    metaInitialized = true;
  } catch (error) {
    console.error('[MetaAds] Failed to initialize:', error);
  }
};

const logMetaEvent = async (
  eventName: string,
  amount?: number,
  parameters?: Record<string, any>
) => {
  if (isExpoGoRuntime()) {
    return;
  }

  await initializeMetaAdsTracking();

  if (!AppEventsLogger || typeof AppEventsLogger.logEvent !== 'function') {
    return;
  }

  try {
    if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
      AppEventsLogger.logEvent(eventName, amount, parameters || {});
      return;
    }

    AppEventsLogger.logEvent(eventName, undefined, parameters || {});
  } catch (error) {
    if (__DEV__) {
      console.warn('[MetaAds] Failed to log event:', eventName, error);
    }
  }
};

export const trackMetaCompleteRegistration = async (method?: string, role?: string) => {
  await logMetaEvent('fb_mobile_complete_registration', undefined, {
    method,
    role,
  });
};

export const trackMetaInitiatedCheckout = async (
  amount?: number,
  metadata?: Record<string, any>
) => {
  await logMetaEvent('fb_mobile_initiated_checkout', amount, {
    currency: 'USD',
    ...metadata,
  });
};

export const trackMetaPurchase = async (
  amount: number,
  currency: string = 'USD',
  metadata?: Record<string, any>
) => {
  if (isExpoGoRuntime()) {
    return;
  }

  await initializeMetaAdsTracking();

  if (!AppEventsLogger) {
    return;
  }

  try {
    if (typeof AppEventsLogger.logPurchase === 'function') {
      AppEventsLogger.logPurchase(amount, currency, metadata || {});
      return;
    }

    await logMetaEvent('fb_mobile_purchase', amount, {
      currency,
      ...metadata,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[MetaAds] Failed to log purchase:', error);
    }
  }
};
