import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react-native';

/**
 * Hook to monitor screen performance
 * Automatically tracks screen load time and reports to Sentry
 * 
 * @param screenName - Name of the screen to track
 * @param enabled - Whether to enable performance monitoring (default: true)
 * 
 * @example
 * ```tsx
 * function MyScreen() {
 *   usePerformanceMonitoring('MyScreen');
 *   // ... rest of component
 * }
 * ```
 */
export const usePerformanceMonitoring = (screenName: string, enabled: boolean = true) => {
  const transactionRef = useRef<Sentry.Span | null>(null);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    // Start span on mount
    mountTimeRef.current = Date.now();
    transactionRef.current = Sentry.startInactiveSpan({
      name: `Screen: ${screenName}`,
      op: 'screen.load',
    });

    // Cleanup on unmount
    return () => {
      if (transactionRef.current) {
        const loadTime = Date.now() - mountTimeRef.current;
        
        // Add measurement for screen load time
        Sentry.setMeasurement('screen_load_time', loadTime, 'millisecond');
        
        // Finish span
        transactionRef.current.end();
        transactionRef.current = null;
      }
    };
  }, [screenName, enabled]);

  /**
   * Mark a specific operation within the screen
   * Useful for tracking specific user interactions or data loading
   */
  const markOperation = (operationName: string) => {
    if (!enabled || !transactionRef.current) return;

    const span = Sentry.startInactiveSpan({
      op: operationName,
      name: `${screenName} - ${operationName}`,
    });

    return {
      finish: () => span.end(),
    };
  };

  return { markOperation };
};

/**
 * Hook to monitor API call performance
 * Tracks API request duration and reports to Sentry
 * 
 * @param apiName - Name of the API endpoint
 * @param enabled - Whether to enable performance monitoring (default: true)
 * 
 * @example
 * ```tsx
 * const { trackApiCall } = useApiPerformanceMonitoring('fetchBookings');
 * 
 * const fetchData = async () => {
 *   const span = trackApiCall();
 *   try {
 *     const data = await api.fetchBookings();
 *     span.finish();
 *     return data;
 *   } catch (error) {
 *     span.finish();
 *     throw error;
 *   }
 * };
 * ```
 */
export const useApiPerformanceMonitoring = (apiName: string, enabled: boolean = true) => {
  const trackApiCall = (method: string = 'GET', url?: string) => {
    if (!enabled) {
      return { finish: () => {} };
    }

    const transaction = Sentry.startInactiveSpan({
      name: `API: ${apiName}`,
      op: 'http.client',
      attributes: {
        method,
        url: url || apiName,
      },
    });

    return {
      finish: (_statusCode?: number) => {
        transaction.end();
      },
      setTag: (_key: string, _value: string) => { /* no-op in v7 span API */ },
      setData: (_key: string, _value: any) => { /* no-op in v7 span API */ },
    };
  };

  return { trackApiCall };
};

/**
 * Hook to monitor component render performance
 * Tracks how long a component takes to render
 * 
 * @param componentName - Name of the component
 * @param enabled - Whether to enable performance monitoring (default: true)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderPerformanceMonitoring('MyComponent');
 *   // ... rest of component
 * }
 * ```
 */
export const useRenderPerformanceMonitoring = (componentName: string, enabled: boolean = true) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const renderTime = Date.now() - lastRenderTimeRef.current;
    lastRenderTimeRef.current = Date.now();

    // Only report slow renders (> 100ms)
    if (renderTime > 100 && renderCountRef.current > 1) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow render detected in ${componentName}`,
        level: 'warning',
        data: {
          renderTime,
          renderCount: renderCountRef.current,
        },
      });
    }
  });
};

export default usePerformanceMonitoring;

