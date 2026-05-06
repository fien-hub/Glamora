// Jest setup for React Native app: mock Sentry to avoid ESM parsing issues in tests
// Runs before each test file via setupFilesAfterEnv in jest.config.js

// Provide default env vars so Supabase client can initialize in tests
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('@sentry/react-native', () => {
  const noop = () => {};
  class ReactNativeTracing { constructor() {} }
  class ReactNavigationInstrumentation { constructor() {} }
  return {
    init: noop,
    captureException: noop,
    captureMessage: noop,
    withScope: (fn) => fn && fn({ setExtra: noop }),
    setUser: noop,
    setContext: noop,
    setTag: noop,
    addBreadcrumb: noop,
    startTransaction: () => ({ finish: noop }),
    ReactNativeTracing,
    ReactNavigationInstrumentation,
  };
});

// Mock AsyncStorage to avoid native module requirement in Jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo SecureStore used by Supabase auth storage
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock Expo Constants to avoid importing expo-modules-core in Jest
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: {} },
    platform: { android: null, ios: null, web: null },
    manifest: null,
    systemFonts: [],
  },
}));

// Mock Expo Device (native module) to avoid expo-modules-core dependency in Jest
jest.mock('expo-device', () => ({
  osName: 'iOS',
  osVersion: '17.0',
  modelName: 'iPhone',
  brand: 'Apple',
}));

// Mock Expo Apple Authentication (native module) for tests
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
}));

// Mock Expo Location (native module) for tests
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      altitude: 0,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: () => {} }),
}));

// Mock Expo Calendar (native module) for tests
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  getCalendarsAsync: jest
    .fn()
    .mockResolvedValue([
      {
        id: '1',
        title: 'Default',
        isPrimary: true,
        allowsModifications: true,
      },
    ]),
  createEventAsync: jest.fn().mockResolvedValue('event-1'),
  updateEventAsync: jest.fn().mockResolvedValue(undefined),
  deleteEventAsync: jest.fn().mockResolvedValue(undefined),
  AlarmMethod: { ALERT: 'alert' },
  EntityTypes: { EVENT: 'event' },
}));

// Make Supabase client query builder mockable in tests that expect jest.fn()
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('./src/services/supabase');
  if (supabase) {
    // Replace `from` with a jest mock so tests can do (supabase.from as jest.Mock)...
    // Individual tests will provide the return shape they need
    supabase.from = jest.fn();

    // Provide minimal auth mocks used by some utils during tests
    supabase.auth = {
      signInWithIdToken: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
  }
} catch (e) {
  // If requiring supabase fails during setup, ignore; tests that import it will still work
}
