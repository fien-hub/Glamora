/**
 * Sentry service — safe lazy-loading wrapper.
 *
 * @sentry/react-native registers native integrations (reactNativeTracingIntegration,
 * reactNavigationIntegration) during module evaluation. In React Native 0.81 +
 * New Architecture (TurboModules) builds this can throw before the TurboModule
 * registry is ready, crashing every file that transitively imports sentry.ts —
 * including AuthContext.tsx — and causing the splash screen to freeze.
 *
 * Fix: never import @sentry/react-native at the module top level. Load it
 * lazily on first use so native modules are always fully registered by then.
 */
import Constants from 'expo-constants';

type SentryModule = typeof import('@sentry/react-native');

let _sentry: SentryModule | null = null;

function getSentry(): SentryModule | null {
  if (_sentry !== null) return _sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _sentry = require('@sentry/react-native') as SentryModule;
    return _sentry;
  } catch (e) {
    console.warn('[sentry.ts] @sentry/react-native failed to load:', e);
    return null;
  }
}

export const initSentry = () => {
  const S = getSentry();
  if (!S) return;

  const sentryDsn = Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENV || process.env.EXPO_PUBLIC_ENV || 'development';

  if (environment === 'development') {
    console.log('[Sentry] Skipping initialization in development mode');
    return;
  }

  if (!sentryDsn) {
    console.warn('[Sentry] DSN not provided. Error tracking will not be enabled.');
    return;
  }

  try {
    S.init({
      dsn: sentryDsn,
      environment,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: environment === 'production' ? 0.2 : 1.0,
      profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
      sampleRate: 1.0,
      enableNative: true,
      enableAutoPerformanceTracing: true,
      attachStacktrace: true,
      maxBreadcrumbs: 100,
      release: Constants.expoConfig?.version || '1.0.0',
      dist: Constants.expoConfig?.extra?.buildNumber || '1',
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
        }
        if (event.request?.query_string) {
          const qs = String(event.request.query_string);
          event.request.query_string = qs
            .replace(/token=[^&]*/gi, 'token=[REDACTED]')
            .replace(/password=[^&]*/gi, 'password=[REDACTED]')
            .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]');
        }
        if (event.extra) {
          delete event.extra.password;
          delete event.extra.token;
          delete event.extra.apiKey;
          delete event.extra.creditCard;
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'navigation') {
          const sensitive = ['Payment', 'CreditCard', 'BankAccount'];
          if (breadcrumb.data && sensitive.some((s) => breadcrumb.data?.to?.includes(s))) {
            return null;
          }
        }
        if (breadcrumb.category === 'console' && breadcrumb.message) {
          breadcrumb.message = breadcrumb.message
            .replace(/password[:\s=]+[^\s,}]*/gi, 'password: [REDACTED]')
            .replace(/token[:\s=]+[^\s,}]*/gi, 'token: [REDACTED]')
            .replace(/api[_-]?key[:\s=]+[^\s,}]*/gi, 'api_key: [REDACTED]');
        }
        return breadcrumb;
      },
      integrations: [
        S.reactNativeTracingIntegration(),
        S.reactNavigationIntegration(),
      ],
    });
    console.log('[Sentry] Initialized successfully');
  } catch (e) {
    console.warn('[Sentry] init() threw:', e);
  }
};

export const setSentryUser = (user: { id: string; email?: string; role?: string; username?: string }) => {
  try { getSentry()?.setUser({ id: user.id, email: user.email, username: user.username }); } catch {}
};

export const clearSentryUser = () => {
  try { getSentry()?.setUser(null); } catch {}
};

export const setSentryContext = (key: string, context: Record<string, any>) => {
  try { getSentry()?.setContext(key, context); } catch {}
};

export const setSentryTag = (key: string, value: string) => {
  try { getSentry()?.setTag(key, value); } catch {}
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  const S = getSentry();
  if (!S) return;
  try {
    if (context) {
      S.withScope((scope) => {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        S.captureException(error);
      });
    } else {
      S.captureException(error);
    }
  } catch {}
};

export const captureMessage = (message: string, level?: any) => {
  try { getSentry()?.captureMessage(message, level); } catch {}
};

export const addBreadcrumb = (breadcrumb: { message: string; category?: string; level?: any; data?: Record<string, any> }) => {
  try { getSentry()?.addBreadcrumb(breadcrumb); } catch {}
};

export const startTransaction = (name: string, op: string) => {
  try { return getSentry()?.startInactiveSpan({ name, op }); } catch { return null; }
};

export default { getSentry };
