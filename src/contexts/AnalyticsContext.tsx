import React, { createContext, useContext, useEffect, useState } from 'react';
import analytics, { EventProperties, UserProperties } from '../utils/analytics';
import { useAuth } from './AuthContext';

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: EventProperties) => Promise<void>;
  trackScreenView: (screenName: string, properties?: EventProperties) => Promise<void>;
  setUserProperties: (properties: UserProperties) => Promise<void>;
  incrementUserProperty: (property: string, value?: number) => Promise<void>;
  trackRevenue: (amount: number, properties?: EventProperties) => Promise<void>;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

type AnalyticsProviderProps = {
  children: React.ReactNode;
  enabled?: boolean;
};

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children, enabled = true }) => {
  const { user, userRole } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize analytics on mount
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(false);
      return;
    }

    const initAnalytics = async () => {
      try {
        await analytics.initialize();
        setIsInitialized(true);
        console.log('Analytics initialized successfully');
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };

    initAnalytics();
  }, [enabled]);

  // Identify user when auth state changes
  useEffect(() => {
    const identifyUser = async () => {
      if (user && isInitialized) {
        try {
          // Get user profile data
          const userProperties: UserProperties = {
            userId: user.id,
            email: user.email,
            role: userRole || undefined,
          };

          await analytics.identifyUser(user.id, userProperties);
          console.log('User identified in analytics:', user.id);
        } catch (error) {
          console.error('Failed to identify user in analytics:', error);
        }
      } else if (!user && isInitialized) {
        // Reset analytics on logout
        await analytics.reset();
        console.log('Analytics reset on logout');
      }
    };

    identifyUser();
  }, [user, userRole, isInitialized]);

  const trackEvent = async (eventName: string, properties?: EventProperties) => {
    if (!isInitialized) return;
    await analytics.trackEvent(eventName, properties);
  };

  const trackScreenView = async (screenName: string, properties?: EventProperties) => {
    if (!isInitialized) return;
    await analytics.trackScreenView(screenName, properties);
  };

  const setUserProperties = async (properties: UserProperties) => {
    if (!isInitialized) return;
    await analytics.setUserProperties(properties);
  };

  const incrementUserProperty = async (property: string, value: number = 1) => {
    if (!isInitialized) return;
    await analytics.incrementUserProperty(property, value);
  };

  const trackRevenue = async (amount: number, properties?: EventProperties) => {
    if (!isInitialized) return;
    await analytics.trackRevenue(amount, properties);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        trackEvent,
        trackScreenView,
        setUserProperties,
        incrementUserProperty,
        trackRevenue,
        isInitialized,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

