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
import React, { useRef, useState, Suspense, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
let _Clipboard: { setString: (s: string) => void } = { setString: () => {} };
try { _Clipboard = require('@react-native-clipboard/clipboard').default; } catch {
  try { _Clipboard = (require('react-native') as any).Clipboard ?? { setString: () => {} }; } catch { }
}

// ---------------------------------------------------------------------------
// Diagnostic log collector — installed BEFORE any module is required.
// Intercepts console.warn and console.error so we can display them on screen
// when navigation fails to load, giving full visibility into which native
// module is throwing.
// ---------------------------------------------------------------------------
const _diagnosticLogs: string[] = [];
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

function _captureLog(level: 'WARN' | 'ERROR', args: any[]) {
  try {
    const msg = args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      })
      .join(' ');
    _diagnosticLogs.push(`[${level}] ${msg}`);
    if (_diagnosticLogs.length > 200) _diagnosticLogs.shift();
  } catch { /* never throw inside the interceptor */ }
}

console.warn = (...args: any[]) => { _captureLog('WARN', args); _origWarn(...args); };
console.error = (...args: any[]) => { _captureLog('ERROR', args); _origError(...args); };

// ---------------------------------------------------------------------------
// Helper types / Passthrough
// ---------------------------------------------------------------------------
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
//
// IMPORTANT: Metro/Hermes can silently resolve a dynamic import with
// { default: undefined } when a module factory throws during evaluation
// (e.g. because a cached-errored dependency was re-required). The promise
// does NOT reject in that case, so .catch() alone is insufficient.
// The .then() validator below converts a silent undefined into a proper
// rejection so our .catch() fallback always fires.
// ---------------------------------------------------------------------------
const Navigation = React.lazy(() =>
  import('./navigation')
    .then((mod) => {
      if (!mod?.default) {
        console.error('[AppRuntime] navigation/index resolved without default export — a module in its dependency chain likely failed silently.');
        throw new Error(
          'Navigation module has no default export. ' +
          'A required module (AuthContext, a screen, or a navigator) likely ' +
          'threw during Metro module factory evaluation.'
        );
      }
      return mod as { default: React.ComponentType };
    })
    .catch((e) => ({
      default: (() => React.createElement(DiagnosticScreen, { error: e })) as React.ComponentType,
    }))
);

// ---------------------------------------------------------------------------
// DiagnosticScreen — full on-screen log viewer shown when nav fails to load
// ---------------------------------------------------------------------------
function DiagnosticScreen({ error }: { error: unknown }) {
  const [copied, setCopied] = useState(false);

  const errorMsg = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error && error.stack ? `\n${error.stack}` : '';

  const platformInfo = `Platform: ${Platform.OS} ${Platform.Version}\nBuild: production`;

  const relevantLogs = _diagnosticLogs.filter(
    (l) =>
      l.includes('[AppRuntime]') ||
      l.includes('unavailable') ||
      l.includes('load failed') ||
      l.includes('ERROR') ||
      l.includes('failed') ||
      l.includes('throw') ||
      l.includes('undefined') ||
      l.includes('Navigation')
  );

  const fullReport = [
    '=== GLAMORA DIAGNOSTIC REPORT ===',
    platformInfo,
    '',
    '=== NAVIGATION ERROR ===',
    errorMsg + errorStack,
    '',
    '=== MODULE LOAD WARNINGS ===',
    relevantLogs.length > 0 ? relevantLogs.join('\n') : '(none captured)',
    '',
    '=== ALL CAPTURED LOGS ===',
    _diagnosticLogs.length > 0 ? _diagnosticLogs.join('\n') : '(none)',
  ].join('\n');

  const handleCopy = () => {
    try {
      _Clipboard.setString(fullReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', paddingTop: 60 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
        <Text style={{ color: '#ff4444', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
          Navigation failed to load
        </Text>
        <Text style={{ color: '#999', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
          Diagnostic build — share the logs below
        </Text>
      </View>

      {/* Error summary */}
      <View style={{ backgroundColor: '#1a0000', margin: 12, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#ff4444' }}>
        <Text style={{ color: '#ff8888', fontSize: 11, fontFamily: 'monospace' }} selectable>
          {errorMsg}
        </Text>
      </View>

      {/* Platform info */}
      <View style={{ paddingHorizontal: 12, marginBottom: 4 }}>
        <Text style={{ color: '#666', fontSize: 10 }}>{platformInfo}</Text>
      </View>

      {/* Copy button */}
      <TouchableOpacity
        onPress={handleCopy}
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          backgroundColor: copied ? '#1a5c1a' : '#1a3a5c',
          borderRadius: 6,
          padding: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: copied ? '#66ff66' : '#66aaff', fontSize: 13, fontWeight: '600' }}>
          {copied ? '✓ Copied to clipboard!' : '📋 Copy full report'}
        </Text>
      </TouchableOpacity>

      {/* Log scroll view */}
      <Text style={{ color: '#555', fontSize: 10, paddingHorizontal: 12, marginBottom: 4 }}>
        MODULE LOAD LOG ({_diagnosticLogs.length} entries) — scroll to see all
      </Text>
      <ScrollView
        style={{ flex: 1, marginHorizontal: 12, marginBottom: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {relevantLogs.length > 0 ? (
          <>
            <Text style={{ color: '#ff9900', fontSize: 10, marginBottom: 6, fontWeight: '600' }}>
              ⚠ RELEVANT WARNINGS ({relevantLogs.length})
            </Text>
            {relevantLogs.map((log, i) => (
              <Text key={`r${i}`} style={{ color: '#ffbb66', fontSize: 10, fontFamily: 'monospace', marginBottom: 2 }} selectable>
                {log}
              </Text>
            ))}
            <View style={{ height: 1, backgroundColor: '#333', marginVertical: 8 }} />
          </>
        ) : (
          <Text style={{ color: '#666', fontSize: 10, marginBottom: 8 }}>
            No module-load warnings captured. The crash happened before the interceptor ran — likely a hard JS syntax error.
          </Text>
        )}
        <Text style={{ color: '#555', fontSize: 10, marginBottom: 4, fontWeight: '600' }}>
          ALL LOGS ({_diagnosticLogs.length})
        </Text>
        {_diagnosticLogs.map((log, i) => (
          <Text
            key={`a${i}`}
            style={{
              color: log.startsWith('[ERROR]') ? '#ff6666' : log.startsWith('[WARN]') ? '#ffaa44' : '#888',
              fontSize: 9,
              fontFamily: 'monospace',
              marginBottom: 1,
            }}
            selectable
          >
            {log}
          </Text>
        ))}
        {_diagnosticLogs.length === 0 && (
          <Text style={{ color: '#555', fontSize: 10 }}>
            No logs captured. The crash happened synchronously during metro bundle evaluation before the interceptor was installed.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function NavigationLoadingFallback() {
  const [showStatus, setShowStatus] = useState(false);
  useEffect(() => {
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
  const [fontsLoaded, setFontsLoaded] = useState(false);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } },
    });
  }
  const queryClient = queryClientRef.current;

  // Load all @expo/vector-icons TTF fonts before the navigation tree renders
  // so icon glyphs are available from first paint with no blank-then-appear flash.
  // Each require() must be a static string literal (Metro bundler requirement).
  // A 2 s timeout ensures the app is never permanently blocked if loading fails.
  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[AppRuntime] Font loading timed out — rendering without pre-loaded fonts');
        setFontsLoaded(true);
      }
    }, 2000);

    (async () => {
      try {
        /* eslint-disable @typescript-eslint/no-var-requires */
        const Font = require('expo-font') as typeof import('expo-font');
        const fontMap: Record<string, number> = {};
        try { fontMap['AntDesign']              = require('@expo/vector-icons/fonts/AntDesign.ttf'); }              catch { /* missing */ }
        try { fontMap['Entypo']                 = require('@expo/vector-icons/fonts/Entypo.ttf'); }                 catch { /* missing */ }
        try { fontMap['EvilIcons']              = require('@expo/vector-icons/fonts/EvilIcons.ttf'); }              catch { /* missing */ }
        try { fontMap['Feather']                = require('@expo/vector-icons/fonts/Feather.ttf'); }                catch { /* missing */ }
        try { fontMap['FontAwesome']            = require('@expo/vector-icons/fonts/FontAwesome.ttf'); }            catch { /* missing */ }
        try { fontMap['FontAwesome5_Regular']   = require('@expo/vector-icons/fonts/FontAwesome5_Regular.ttf'); }   catch { /* missing */ }
        try { fontMap['FontAwesome5_Solid']     = require('@expo/vector-icons/fonts/FontAwesome5_Solid.ttf'); }     catch { /* missing */ }
        try { fontMap['FontAwesome5_Brands']    = require('@expo/vector-icons/fonts/FontAwesome5_Brands.ttf'); }    catch { /* missing */ }
        try { fontMap['Foundation']             = require('@expo/vector-icons/fonts/Foundation.ttf'); }             catch { /* missing */ }
        try { fontMap['Ionicons']               = require('@expo/vector-icons/fonts/Ionicons.ttf'); }               catch { /* missing */ }
        try { fontMap['MaterialCommunityIcons'] = require('@expo/vector-icons/fonts/MaterialCommunityIcons.ttf'); } catch { /* missing */ }
        try { fontMap['MaterialIcons']          = require('@expo/vector-icons/fonts/MaterialIcons.ttf'); }          catch { /* missing */ }
        try { fontMap['Octicons']               = require('@expo/vector-icons/fonts/Octicons.ttf'); }               catch { /* missing */ }
        try { fontMap['SimpleLineIcons']        = require('@expo/vector-icons/fonts/SimpleLineIcons.ttf'); }        catch { /* missing */ }
        try { fontMap['Zocial']                 = require('@expo/vector-icons/fonts/Zocial.ttf'); }                 catch { /* missing */ }
        /* eslint-enable @typescript-eslint/no-var-requires */
        if (Object.keys(fontMap).length > 0) {
          await Font.loadAsync(fontMap);
          recordStartupCheckpoint('AppRuntime.fontsLoaded', 'ok', { count: Object.keys(fontMap).length });
        }
      } catch (e) {
        console.warn('[AppRuntime] Font.loadAsync failed (non-fatal):', e);
        recordStartupCheckpoint('AppRuntime.fontsLoaded', 'warn', {
          reason: e instanceof Error ? e.message : String(e),
        });
      }
      clearTimeout(timeoutId);
      if (!cancelled) setFontsLoaded(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    recordStartupCheckpoint('AppRuntime.componentMounted', 'ok');
    const t = setTimeout(() => {
      setDeferredStartupEnabled(true);
      recordStartupCheckpoint('AppRuntime.deferredStartupEnabled', 'ok', { delayMs: 600 });
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
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
                  {fontsLoaded ? (
                    <Suspense fallback={<NavigationLoadingFallback />}>
                      <Navigation />
                    </Suspense>
                  ) : (
                    <NavigationLoadingFallback />
                  )}
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
