import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as ExpoSplashScreen from 'expo-splash-screen';
import Navigation from './src/navigation';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationsProvider } from './src/contexts/NotificationsContext';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry } from './src/services/sentry';

// Hide native splash screen immediately
ExpoSplashScreen.hideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const stripePublishableKey =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  '';

function AppContent() {
  // Note: Session activity is automatically tracked via AppState changes in AuthContext
  // User interactions update the session timestamp when app becomes active

  return (
    <Navigation />
  );
}

export default function App() {
  // Initialize Sentry on app start
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StripeProvider publishableKey={stripePublishableKey}>
              <AuthProvider>
                <AnalyticsProvider>
                  <NotificationsProvider>
                    <AppContent />
                    <StatusBar style="auto" />
                  </NotificationsProvider>
                </AnalyticsProvider>
              </AuthProvider>
            </StripeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

