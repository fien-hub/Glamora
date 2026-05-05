import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { recordStartupCheckpoint } from './utils/startupDiagnostics';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './navigation';
import { initSentry } from './services/sentry';

export default function AppRuntime() {
  const queryClientRef = useRef<QueryClient | null>(null);

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
    try {
      initSentry();
      recordStartupCheckpoint('AppRuntime.initSentry', 'ok');
    } catch (error) {
      recordStartupCheckpoint('AppRuntime.initSentry', 'warn', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
      console.warn('[AppRuntime] Sentry init failed (non-blocking):', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <Navigation />
                <StatusBar style="auto" />
              </AuthProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
