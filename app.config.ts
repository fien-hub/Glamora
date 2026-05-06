import type { ExpoConfig } from 'expo/config';

const baseConfig: ExpoConfig = {
  name: 'Glamora',
  slug: 'glamora-app',
  version: '1.0.0',
  sdkVersion: '54.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  experiments: {
    baseUrl: '/',
    tsconfigPaths: false,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.glamora.app',
    buildNumber: '1',
    icon: './assets/icon.png',
    backgroundColor: '#FFFFFF',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Glamora needs your location to find beauty professionals near you and calculate travel distances.',
      NSCameraUsageDescription:
        'Glamora needs camera access to take photos for your profile and portfolio.',
      NSPhotoLibraryUsageDescription:
        'Glamora needs photo library access to upload images to your profile and portfolio.',
      NSCalendarsUsageDescription: 'Glamora needs calendar access to add booking reminders.',
      NSFaceIDUsageDescription: 'Glamora uses Face ID for secure and quick authentication.',
      NSUserTrackingUsageDescription:
        'We use tracking to measure ad performance and improve customer acquisition.',
      ITSAppUsesNonExemptEncryption: false,
      UIUserInterfaceStyle: 'Light',
      SKAdNetworkItems: [
        {
          SKAdNetworkIdentifier: 'v9wttpbfk9.skadnetwork',
        },
        {
          SKAdNetworkIdentifier: 'n38lu8286q.skadnetwork',
        },
        {
          SKAdNetworkIdentifier: '4dzt52r2t5.skadnetwork',
        },
      ],
    },
  },
  android: {
    package: 'com.fien.glamoraapp',
    permissions: [
      'com.google.android.gms.permission.AD_ID',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          newArchEnabled: true,
          buildReactNativeFromSource: true,
        },
      },
    ],
    '@react-native-community/datetimepicker',
    '@sentry/react-native',
    'expo-secure-store',
    'expo-router',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow Glamora to use your location to find beauty professionals near you.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Glamora to access your photos to upload images.',
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: 'Allow Glamora to access your calendar to add booking reminders.',
      },
    ],
    ['expo-apple-authentication'],
    ['@react-native-google-signin/google-signin'],
    [
      'react-native-fbsdk-next',
      {
        appID: 'YOUR_META_APP_ID',
        clientToken: 'YOUR_META_CLIENT_TOKEN',
        displayName: 'Glamora',
        scheme: 'fbYOUR_META_APP_ID',
        advertiserIDCollectionEnabled: true,
        autoLogAppEventsEnabled: true,
        isAutoInitEnabled: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Glamora to use Face ID for secure authentication.',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission:
          'Allow tracking to measure ad performance and improve your app experience.',
      },
    ],
    ['@sentry/react-native/expo'],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#FFB6C1',
        sounds: ['./assets/sounds/click.mp3'],
      },
    ],
  ],
  scheme: 'glamora',
  extra: {
    meta: {
      appId: 'YOUR_META_APP_ID',
    },
    eas: {
      projectId: '981368a6-0d58-422e-976b-8caf8e7e6683',
    },
  },
  owner: 'fien',
};

const isValidEnvValue = (value?: string) => {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 0 && !normalized.startsWith('your_') && !normalized.startsWith('YOUR_');
};

const replacePlugin = (
  plugins: NonNullable<ExpoConfig['plugins']>,
  pluginName: string,
  pluginConfig: Record<string, any>
): NonNullable<ExpoConfig['plugins']> => {
  const withoutExisting = plugins.filter((plugin) => {
    if (Array.isArray(plugin)) {
      return plugin[0] !== pluginName;
    }

    return plugin !== pluginName;
  });

  return [...withoutExisting, [pluginName, pluginConfig]];
};

export default (): ExpoConfig => {
  const metaAppIdFromEnv = process.env.EXPO_PUBLIC_META_APP_ID;
  const metaClientTokenFromEnv = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN;

  const isMetaConfigured = isValidEnvValue(metaAppIdFromEnv) && isValidEnvValue(metaClientTokenFromEnv);

  const configuredMetaAppId = isValidEnvValue(metaAppIdFromEnv)
    ? metaAppIdFromEnv!.trim()
    : (baseConfig.extra as any)?.meta?.appId || 'YOUR_META_APP_ID';

  const configuredMetaClientToken = isValidEnvValue(metaClientTokenFromEnv)
    ? metaClientTokenFromEnv!.trim()
    : 'YOUR_META_CLIENT_TOKEN';

  const plugins = replacePlugin(
    (baseConfig.plugins || []) as NonNullable<ExpoConfig['plugins']>,
    'react-native-fbsdk-next',
    {
      appID: configuredMetaAppId,
      clientToken: configuredMetaClientToken,
      displayName: 'Glamora',
      scheme: `fb${configuredMetaAppId}`,
      advertiserIDCollectionEnabled: true,
      autoLogAppEventsEnabled: true,
      // Disable auto-init when using placeholder App ID to prevent SIGABRT on TurboModule queue
      isAutoInitEnabled: isMetaConfigured,
    }
  );

  return {
    ...baseConfig,
    plugins,
    updates: {
      enabled: false,
    },
    extra: {
      ...baseConfig.extra,
      meta: {
        appId: configuredMetaAppId,
      },
    },
  };
};
