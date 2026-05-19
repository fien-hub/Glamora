import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { recordStartupCheckpoint } from './utils/startupDiagnostics';
import ErrorBoundary from './components/ErrorBoundary';
import { initSentry } from './services/sentry';
import { AuthProvider } from './contexts/AuthContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';

// Lazy-load only Navigation (heavy component with 50+ screen imports)
const Navigation = lazy(() => import('./navigation'));

export default function AppRuntime() {
  const queryClientRef = useRef<QueryClient | null>(null);
  const [deferredStartupEnabled, setDeferredStartupEnabled] = useState(false);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          staleTime: 5 * 60 * 1000,
        },
      },
    });
  }
  const queryClient = queryClientRef.current;

  useEffect(() => {
    recordStartupCheckpoint('AppRuntime.componentMounted', 'ok');
    const timer = setTimeout(() => {
      setDeferredStartupEnabled(true);
      recordStartupCheckpoint('AppRuntime.deferredStartupEnabled', 'ok', { delayMs: 600 });
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!deferredStartupEnabled) {
      return;
    }

    try {
      initSentry();
      recordStartupCheckpoint('AppRuntime.initSentry', 'ok');
    } catch (error) {
      recordStartupCheckpoint('AppRuntime.initSentry', 'warn', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      console.warn('[AppRuntime] Sentry init failed (non-blocking):', error);
    }
  }, [deferredStartupEnabled]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AnalyticsProvider enabled={deferredStartupEnabled}>
                  <Suspense
                    fallback={
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                        <ActivityIndicator size="large" color="#E91E63" />
                      </View>
                    }
                  >
                    <Navigation />
                  </Suspense>
                  <StatusBar style="auto" />
                </AnalyticsProvider>
              </AuthProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
