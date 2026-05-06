import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  const sentryDsn = Constants.expoConfig?.extra?.EXPO_PUBLIC_SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;
  const environment = Constants.expoConfig?.extra?.EXPO_PUBLIC_ENV || process.env.EXPO_PUBLIC_ENV || 'development';

  // Only initialize Sentry in production or staging
  if (environment === 'development') {
    console.log('[Sentry] Skipping initialization in development mode');
    return;
  }

  if (!sentryDsn) {
    console.warn('[Sentry] DSN not provided. Error tracking will not be enabled.');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    
    // Enable automatic session tracking
    enableAutoSessionTracking: true,
    
    // Session tracking interval (30 seconds)
    sessionTrackingIntervalMillis: 30000,
    
    // Enable performance monitoring
    tracesSampleRate: environment === 'production' ? 0.2 : 1.0, // 20% in prod, 100% in staging
    
    // Enable profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in staging
    
    // Capture 100% of errors
    sampleRate: 1.0,
    
    // Enable native crash handling
    enableNative: true,
    
    // Enable automatic breadcrumbs
    enableAutoPerformanceTracing: true,
    
    // Attach stack traces to messages
    attachStacktrace: true,
    
    // Maximum breadcrumbs to keep
    maxBreadcrumbs: 100,
    
    // Release version
    release: Constants.expoConfig?.version || '1.0.0',
    
    // Distribution (build number)
    dist: Constants.expoConfig?.extra?.buildNumber || '1',
    
    // Before send hook - filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from event
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
        }
        
        // Remove sensitive query parameters
        if (event.request.query_string) {
          const qs = String(event.request.query_string);
          event.request.query_string = qs
            .replace(/token=[^&]*/gi, 'token=[REDACTED]')
            .replace(/password=[^&]*/gi, 'password=[REDACTED]')
            .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]');
        }
      }
      
      // Remove sensitive data from extra context
      if (event.extra) {
        delete event.extra.password;
        delete event.extra.token;
        delete event.extra.apiKey;
        delete event.extra.creditCard;
      }
      
      return event;
    },
    
    // Before breadcrumb hook - filter sensitive breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't log navigation to sensitive screens
      if (breadcrumb.category === 'navigation') {
        const sensitiveScreens = ['Payment', 'CreditCard', 'BankAccount'];
        if (breadcrumb.data && sensitiveScreens.some(screen => breadcrumb.data?.to?.includes(screen))) {
          return null; // Don't log this breadcrumb
        }
      }
      
      // Filter sensitive data from console logs
      if (breadcrumb.category === 'console') {
        if (breadcrumb.message) {
          breadcrumb.message = breadcrumb.message
            .replace(/password[:\s=]+[^\s,}]*/gi, 'password: [REDACTED]')
            .replace(/token[:\s=]+[^\s,}]*/gi, 'token: [REDACTED]')
            .replace(/api[_-]?key[:\s=]+[^\s,}]*/gi, 'api_key: [REDACTED]');
        }
      }
      
      return breadcrumb;
    },
    
    // Integrations
    integrations: [
      Sentry.reactNativeTracingIntegration(),
      Sentry.reactNavigationIntegration(),
    ],
  });

  console.log('[Sentry] Initialized successfully');
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  role?: string;
  username?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context to errors
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Add tags for filtering errors
 */
export const setSentryTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Manually capture a message
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Add a breadcrumb manually
 */
export const addBreadcrumb = (breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Start a performance span (v7+ API)
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startInactiveSpan({ name, op });
};

export default Sentry;

