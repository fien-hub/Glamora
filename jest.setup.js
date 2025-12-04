// Mock React before anything else
import 'react-native';
import React from 'react';

// Set up React for testing
global.React = React;

import '@testing-library/react-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase
jest.mock('./src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test-url.com' } })),
      })),
    },
  },
  dbService: {
    getProviders: jest.fn(() => Promise.resolve([])),
    getBookings: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: 'test-image-uri', width: 100, height: 100 }],
    })
  ),
  MediaTypeOptions: {
    Images: 'Images',
  },
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 0, longitude: 0 },
    })
  ),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'test-push-token' })
  ),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() =>
    Promise.resolve({ success: true })
  ),
  SecurityLevel: {
    BIOMETRIC_STRONG: 2,
  },
}));

jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCalendarsAsync: jest.fn(() => Promise.resolve([])),
  createEventAsync: jest.fn(() => Promise.resolve('test-event-id')),
  deleteEventAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-device', () => ({
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
    manifest: {},
  },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system', () => ({
  downloadAsync: jest.fn(() =>
    Promise.resolve({ uri: 'file://test-path' })
  ),
  cacheDirectory: 'file://cache/',
}));

// Mock Clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }) => children,
  useStripe: () => ({
    confirmPayment: jest.fn(() => Promise.resolve({ paymentIntent: { id: 'test-id' } })),
    createPaymentMethod: jest.fn(() => Promise.resolve({ paymentMethod: { id: 'test-pm-id' } })),
  }),
  CardField: 'CardField',
}));

// Mock Mixpanel
jest.mock('mixpanel-react-native', () => ({
  Mixpanel: {
    init: jest.fn(() => Promise.resolve()),
    track: jest.fn(),
    identify: jest.fn(),
    getPeople: jest.fn(() => ({
      set: jest.fn(),
    })),
  },
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({
        idToken: 'test-id-token',
        user: { email: 'test@example.com' },
      })
    ),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Apple Authentication
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() =>
    Promise.resolve({
      identityToken: 'test-identity-token',
      email: 'test@example.com',
    })
  ),
  AppleAuthenticationScope: {
    EMAIL: 'EMAIL',
    FULL_NAME: 'FULL_NAME',
  },
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

