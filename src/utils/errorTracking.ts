// @sentry/react-native is NOT imported directly here — it is accessed only
// through the safe lazy-loading functions in ../services/sentry.
import { captureException, captureMessage, addBreadcrumb, setSentryContext } from '../services/sentry';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Track authentication errors
 */
export const trackAuthError = (error: Error, context?: {
  method?: 'email' | 'google' | 'apple' | 'biometric';
  userId?: string;
}) => {
  setSentryContext('auth', {
    method: context?.method || 'unknown',
    userId: context?.userId,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'authentication',
    ...context,
  });
};

/**
 * Track payment errors
 */
export const trackPaymentError = (error: Error, context?: {
  bookingId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
}) => {
  setSentryContext('payment', {
    bookingId: context?.bookingId,
    amount: context?.amount,
    currency: context?.currency || 'USD',
    paymentMethod: context?.paymentMethod,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'payment',
    ...context,
  });
};

/**
 * Track booking errors
 */
export const trackBookingError = (error: Error, context?: {
  bookingId?: string;
  providerId?: string;
  serviceId?: string;
  action?: 'create' | 'update' | 'cancel' | 'complete';
}) => {
  setSentryContext('booking', {
    bookingId: context?.bookingId,
    providerId: context?.providerId,
    serviceId: context?.serviceId,
    action: context?.action,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'booking',
    ...context,
  });
};

/**
 * Track API errors
 */
export const trackApiError = (error: Error, context?: {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
}) => {
  setSentryContext('api', {
    endpoint: context?.endpoint,
    method: context?.method,
    statusCode: context?.statusCode,
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'api',
    ...context,
  });
};

/**
 * Track navigation errors
 */
export const trackNavigationError = (error: Error, context?: {
  from?: string;
  to?: string;
  params?: Record<string, any>;
}) => {
  setSentryContext('navigation', {
    from: context?.from,
    to: context?.to,
    params: context?.params,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'navigation',
    ...context,
  });
};

/**
 * Track data loading errors
 */
export const trackDataLoadError = (error: Error, context?: {
  dataType?: string;
  source?: string;
  query?: string;
}) => {
  setSentryContext('data_load', {
    dataType: context?.dataType,
    source: context?.source,
    query: context?.query,
    timestamp: new Date().toISOString(),
  });

  captureException(error, {
    category: 'data_load',
    ...context,
  });
};

/**
 * Track user action with breadcrumb
 */
export const trackUserAction = (action: string, data?: Record<string, any>) => {
  addBreadcrumb({
    category: 'user_action',
    message: action,
    level: 'info',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Track network status changes
 */
export const trackNetworkStatus = (isConnected: boolean) => {
  addBreadcrumb({
    category: 'network',
    message: isConnected ? 'Network connected' : 'Network disconnected',
    level: isConnected ? 'info' : 'warning',
    data: {
      isConnected,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Track app state changes
 */
export const trackAppState = (state: 'active' | 'background' | 'inactive') => {
  addBreadcrumb({
    category: 'app_state',
    message: `App state changed to ${state}`,
    level: 'info',
    data: {
      state,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Log a message to Sentry
 */
export const logMessage = (message: string, level: ErrorSeverity = 'info', context?: Record<string, any>) => {
  if (context) {
    setSentryContext('log', context);
  }
  
  captureMessage(message, level as any);
};

/**
 * Track feature usage
 */
export const trackFeatureUsage = (featureName: string, data?: Record<string, any>) => {
  addBreadcrumb({
    category: 'feature_usage',
    message: `Feature used: ${featureName}`,
    level: 'info',
    data: {
      featureName,
      ...data,
      timestamp: new Date().toISOString(),
    },
  });
};

