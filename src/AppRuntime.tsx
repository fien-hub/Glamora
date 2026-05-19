/**
 * AppRuntime — providers + navigation shell.
 *
 * CRITICAL RULE: Every require() for ANY module that is not part of React core
 * must be inside a try/catch block. Metro's production runtime propagates a
 * module-factory throw all the way up to App.tsx's synchronous import, which
 * means a single uncaught require() failure prevents SplashScreen.hideAsync()
 * from ever being called — freezing the native splash screen permanently.
 *
 * Wrapping every require() in try/catch guarantees this factory always
 * evaluates successfully, regardless of which native TurboModule fails.
 */
import React, { useRef, useState, Suspense } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

type AnyFC = React.ComponentType<any>;
const Passthrough: AnyFC = ({ children }: { children?: React.ReactNode }) =>
  (children as React.ReactElement) ?? null;

// ---------------------------------------------------------------------------
// @tanstack/react-query
// ---------------------------------------------------------------------------
let QueryClient: new (opts?: any) => any = class FallbackQueryClient { defaultOptions = {}; };
let QueryClientProvider: AnyFC = Passthrough;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rq = require('@tanstack/react-query') as typeof import('@tanstack/react-query');
  if (rq?.QueryClient) QueryClient = rq.QueryClient as any;
  if (rq?.QueryClientProvider) QueryClientProvider = rq.QueryClientProvider as AnyFC;
} catch (e) { console.warn('[AppRuntime] @tanstack/react-query load failed:', e); }

// ---------------------------------------------------------------------------
// startupDiagnostics
// ---------------------------------------------------------------------------
let recordStartupCheckpoint: (name: string, status: string, data?: Record<string, unknown>) => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sd = require('./utils/startupDiagnostics') as typeof import('./utils/startupDiagnostics');
  if (sd?.recordStartupCheckpoint) recordStartupCheckpoint = sd.recordStartupCheckpoint;
} catch (e) { console.warn('[AppRuntime] startupDiagnostics load failed:', e); }

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------
let ErrorBoundary: AnyFC = Passthrough;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const eb = require('./components/ErrorBoundary') as { default: AnyFC };
  if (eb?.default) ErrorBoundary = eb.default;
} catch (e) { console.warn('[AppRuntime] ErrorBoundary load failed:', e); }

// ---------------------------------------------------------------------------
// AuthContext
// ---------------------------------------------------------------------------
let AuthProvider: AnyFC = Passthrough;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ac = require('./contexts/AuthContext') as { AuthProvider: AnyFC };
  if (ac?.AuthProvider) AuthProvider = ac.AuthProvider;
} catch (e) { console.warn('[AppRuntime] AuthContext load failed:', e); }

// ---------------------------------------------------------------------------
// AnalyticsContext
// ---------------------------------------------------------------------------
let AnalyticsProvider: AnyFC = Passthrough;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const an = require('./contexts/AnalyticsContext') as { AnalyticsProvider: AnyFC };
  if (an?.AnalyticsProvider) AnalyticsProvider = an.AnalyticsProvider;
} catch (e) { console.warn('[AppRuntime] AnalyticsContext load failed:', e); }

// ---------------------------------------------------------------------------
// react-native-gesture-handler
// ---------------------------------------------------------------------------
let GestureHandlerRootView: AnyFC = ({ children, style }: any) =>
  React.createElement(View, { style: [{ flex: 1 }, style] }, children);
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rngh = require('react-native-gesture-handler') as typeof import('react-native-gesture-handler');
  if (rngh?.GestureHandlerRootView) GestureHandlerRootView = rngh.GestureHandlerRootView as AnyFC;
} catch (e) { console.warn('[AppRuntime] react-native-gesture-handler load failed:', e); }

// ---------------------------------------------------------------------------
// react-native-safe-area-context
// ---------------------------------------------------------------------------
let SafeAreaProvider: AnyFC = Passthrough;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sac = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
  if (sac?.SafeAreaProvider) SafeAreaProvider = sac.SafeAreaProvider as AnyFC;
} catch (e) { console.warn('[AppRuntime] react-native-safe-area-context load failed:', e); }

// ---------------------------------------------------------------------------
// expo-status-bar
// ---------------------------------------------------------------------------
let StatusBar: AnyFC = () => null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const esb = require('expo-status-bar') as typeof import('expo-status-bar');
  if (esb?.StatusBar) StatusBar = esb.StatusBar as unknown as AnyFC;
} catch (e) { console.warn('[AppRuntime] expo-status-bar load failed:', e); }

// ---------------------------------------------------------------------------
// Sentry (deferred — initialised after first render)
// ---------------------------------------------------------------------------
let initSentry: (() => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sentry = require('./services/sentry') as { initSentry?: () => void };
  if (sentry?.initSentry) initSentry = sentry.initSentry;
} catch (e) { console.warn('[AppRuntime] sentry service load failed:', e); }

// ---------------------------------------------------------------------------
// Navigation — lazy so its 50+ screen imports don't affect THIS factory
// ---------------------------------------------------------------------------
const Navigation = React.lazy(() =>
  import('./navigation').catch((e) => ({
    default: () =>
      React.createElement(
        View,
        { style: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 } },
        React.createElement(Text, { style: { color: 'red', fontSize: 14 } },
          `Navigation failed to load: ${e instanceof Error ? e.message : String(e)}`
        )
      ),
  }))
);

function NavigationLoadingFallback() {
  const [showStatus, setShowStatus] = useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShowStatus(true), 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#E91E63" />
      {showStatus && (
        <Text style={{ marginTop: 16, color: '#888', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          Loading… if this persists, please restart the app.
        </Text>
      )}
    </View>
  );
}

export default function AppRuntime() {
  const queryClientRef = useRef<InstanceType<typeof QueryClient> | null>(null);
  const [deferredStartupEnabled, setDeferredStartupEnabled] = useState(false);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } },
    });
  }
  const queryClient = queryClientRef.current;

  React.useEffect(() => {
    recordStartupCheckpoint('AppRuntime.componentMounted', 'ok');
    const t = setTimeout(() => {
      setDeferredStartupEnabled(true);
      recordStartupCheckpoint('AppRuntime.deferredStartupEnabled', 'ok', { delayMs: 600 });
    }, 600);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!deferredStartupEnabled) return;
    try {
      if (initSentry) {
        initSentry();
        recordStartupCheckpoint('AppRuntime.initSentry', 'ok');
      }
    } catch (error) {
      recordStartupCheckpoint('AppRuntime.initSentry', 'warn', {
        reason: error instanceof Error ? error.message : 'unknown',
      });
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
                  <Suspense fallback={<NavigationLoadingFallback />}>
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
