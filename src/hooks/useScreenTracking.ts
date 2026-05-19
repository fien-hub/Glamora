import { useEffect } from 'react';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { EventProperties } from '../utils/analytics';

/**
 * Custom hook to automatically track screen views
 * @param screenName - Name of the screen to track
 * @param properties - Additional properties to track with the screen view
 */
export const useScreenTracking = (screenName: string, properties?: EventProperties) => {
  const { trackScreenView, isInitialized } = useAnalytics();

  useEffect(() => {
    if (isInitialized) {
      trackScreenView(screenName, properties);
    }
  }, [screenName, isInitialized]);
};

export default useScreenTracking;

