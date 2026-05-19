/**
 * Performance monitoring hooks using Sentry.
 *
 * @sentry/react-native is loaded lazily to prevent module-level native-module
 * crashes in New Architecture builds (same pattern as src/services/sentry.ts).
 */
import { useEffect, useRef } from 'react';

type SentryModule = typeof import('@sentry/react-native');

let _sentry: SentryModule | null = null;
function getSentry(): SentryModule | null {
  if (_sentry !== null) return _sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _sentry = require('@sentry/react-native') as SentryModule;
    return _sentry;
  } catch {
    return null;
  }
}

export const usePerformanceMonitoring = (screenName: string, enabled: boolean = true) => {
  const transactionRef = useRef<any>(null);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    mountTimeRef.current = Date.now();
    try {
      transactionRef.current = getSentry()?.startInactiveSpan({
        name: `Screen: ${screenName}`,
        op: 'screen.load',
      }) ?? null;
    } catch {}

    return () => {
      if (transactionRef.current) {
        try {
          const loadTime = Date.now() - mountTimeRef.current;
          getSentry()?.setMeasurement('screen_load_time', loadTime, 'millisecond');
          transactionRef.current.end();
        } catch {}
        transactionRef.current = null;
      }
    };
  }, [screenName, enabled]);

  const markOperation = (operationName: string) => {
    if (!enabled || !transactionRef.current) return;
    try {
      const span = getSentry()?.startInactiveSpan({
        op: operationName,
        name: `${screenName} - ${operationName}`,
      });
      return { finish: () => { try { span?.end(); } catch {} } };
    } catch {}
    return { finish: () => {} };
  };

  return { markOperation };
};

export const useApiPerformanceMonitoring = (apiName: string, enabled: boolean = true) => {
  const trackApiCall = (method: string = 'GET', url?: string) => {
    if (!enabled) return { finish: () => {} };
    try {
      const transaction = getSentry()?.startInactiveSpan({
        name: `API: ${apiName}`,
        op: 'http.client',
        attributes: { method, url: url || apiName },
      });
      return {
        finish: (_statusCode?: number) => { try { transaction?.end(); } catch {} },
        setTag: (_key: string, _value: string) => {},
        setData: (_key: string, _value: any) => {},
      };
    } catch {}
    return { finish: () => {}, setTag: () => {}, setData: () => {} };
  };

  return { trackApiCall };
};

export const useRenderPerformanceMonitoring = (componentName: string, enabled: boolean = true) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const renderTime = Date.now() - lastRenderTimeRef.current;
    lastRenderTimeRef.current = Date.now();

    if (renderTime > 100 && renderCountRef.current > 1) {
      try {
        getSentry()?.addBreadcrumb({
          category: 'performance',
          message: `Slow render detected in ${componentName}`,
          level: 'warning',
          data: { renderTime, renderCount: renderCountRef.current },
        });
      } catch {}
    }
  });
};

export default usePerformanceMonitoring;
