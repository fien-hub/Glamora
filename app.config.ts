import type { ExpoConfig } from 'expo/config';

const baseConfig: ExpoConfig = {
  name: 'Eve Beauty',
  slug: 'glamora-app',
  version: '1.0.0',
  sdkVersion: '54.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/icon.png',
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
      GIDClientID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '556025469880-2eall9hermo9c9p0c0b6p81h8gj1lbam.apps.googleusercontent.com',
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'Google Sign-In',
          CFBundleURLSchemes: [
            'com.googleusercontent.apps.556025469880-2eall9hermo9c9p0c0b6p81h8gj1lbam',
          ],
        },
      ],
      NSLocationWhenInUseUsageDescription:
        'Eve Beauty needs your location to find beauty professionals near you and calculate travel distances.',
      NSCameraUsageDescription:
        'Eve Beauty needs camera access to take photos for your profile and portfolio.',
      NSPhotoLibraryUsageDescription:
        'Eve Beauty needs photo library access to upload images to your profile and portfolio.',
      NSCalendarsUsageDescription: 'Eve Beauty needs calendar access to add booking reminders.',
      NSFaceIDUsageDescription: 'Eve Beauty uses Face ID for secure and quick authentication.',
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
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          newArchEnabled: true,
        },
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.ttf',
          './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.ttf',
        ],
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow Eve Beauty to use your location to find beauty professionals near you.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Eve Beauty to access your photos to upload images.',
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: 'Allow Eve Beauty to access your calendar to add booking reminders.',
      },
    ],
    ['expo-apple-authentication'],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.556025469880-2eall9hermo9c9p0c0b6p81h8gj1lbam',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Eve Beauty to use Face ID for secure authentication.',
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

const removePlugin = (
  plugins: NonNullable<ExpoConfig['plugins']>,
  pluginName: string
): NonNullable<ExpoConfig['plugins']> => {
  return plugins.filter((plugin) => {
    if (Array.isArray(plugin)) return plugin[0] !== pluginName;
    return plugin !== pluginName;
  });
};

export default (): ExpoConfig => {
  const metaAppIdFromEnv = process.env.EXPO_PUBLIC_META_APP_ID;
  const metaClientTokenFromEnv = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN;
  const easBuildProfile = process.env.EAS_BUILD_PROFILE || 'local';
  const enableIosNewArch = easBuildProfile === 'development';
  const enableMetaSdk = process.env.EXPO_ENABLE_META_SDK === '1'
    || process.env.EXPO_PUBLIC_ENABLE_META_SDK === '1';

  const hasMetaCredentials = isValidEnvValue(metaAppIdFromEnv) && isValidEnvValue(metaClientTokenFromEnv);

  const isFbsdkInstalled = (() => {
    try { require.resolve('react-native-fbsdk-next'); return true; } catch { return false; }
  })();

  const isMetaConfigured = hasMetaCredentials && isFbsdkInstalled && enableMetaSdk;

  // CRITICAL FIX: Only include react-native-fbsdk-next when BOTH Meta credentials
  // are present AND the package is installed. Including this plugin when the package
  // is not installed causes "Failed to resolve plugin" which breaks every EAS build.
  // Including it with a bad App ID causes a TurboModule SIGABRT crash on iOS.
  let plugins = (baseConfig.plugins || []) as NonNullable<ExpoConfig['plugins']>;

  // TestFlight/stores are significantly more stable on the old architecture
  // for this app's current dependency mix.
  plugins = replacePlugin(plugins, 'expo-build-properties', {
    ios: {
      newArchEnabled: enableIosNewArch,
    },
  });

  if (isMetaConfigured) {
    plugins = replacePlugin(plugins, 'react-native-fbsdk-next', {
      appID: metaAppIdFromEnv!.trim(),
      clientToken: metaClientTokenFromEnv!.trim(),
      displayName: 'Eve Beauty',
      scheme: `fb${metaAppIdFromEnv!.trim()}`,
      advertiserIDCollectionEnabled: true,
      autoLogAppEventsEnabled: true,
      isAutoInitEnabled: true,
    });
  } else {
    // Remove the plugin entirely when credentials are missing or plugin is
    // not explicitly enabled for this build.
    // A partially-configured Facebook SDK is far worse than no SDK at all.
    plugins = removePlugin(plugins, 'react-native-fbsdk-next');
  }

  return {
    ...baseConfig,
    plugins,
    updates: {
      enabled: false,
    },
    extra: {
      ...baseConfig.extra,
      meta: {
        appId: isMetaConfigured ? metaAppIdFromEnv!.trim() : 'NOT_CONFIGURED',
      },
    },
  };
};
