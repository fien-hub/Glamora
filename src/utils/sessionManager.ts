import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { trackSessionTimeout, trackSecurityEvent } from './analytics';

const ENABLE_INACTIVITY_TIMEOUT = false;

// Session timeout configuration
const SESSION_TIMEOUT_MINUTES = 30; // 30 minutes of inactivity
const SESSION_WARNING_MINUTES = 5; // Warn 5 minutes before timeout
const SESSION_CHECK_INTERVAL = 60000; // Check every minute (60 seconds)

// Storage keys
const LAST_ACTIVITY_KEY = '@glamora_last_activity';
const SESSION_WARNING_SHOWN_KEY = '@glamora_session_warning_shown';

export interface SessionConfig {
  timeoutMinutes?: number;
  warningMinutes?: number;
  checkInterval?: number;
  onTimeout?: () => void;
  onWarning?: (remainingMinutes: number) => void;
}

class SessionManager {
  private timeoutMinutes: number;
  private warningMinutes: number;
  private checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private onTimeoutCallback?: () => void;
  private onWarningCallback?: (remainingMinutes: number) => void;
  private warningShown: boolean = false;

  constructor(config?: SessionConfig) {
    this.timeoutMinutes = config?.timeoutMinutes || SESSION_TIMEOUT_MINUTES;
    this.warningMinutes = config?.warningMinutes || SESSION_WARNING_MINUTES;
    this.checkInterval = config?.checkInterval || SESSION_CHECK_INTERVAL;
    this.onTimeoutCallback = config?.onTimeout;
    this.onWarningCallback = config?.onWarning;
  }

  /**
   * Initialize session monitoring
   */
  async initialize() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      console.log('[SessionManager] Inactivity timeout disabled');
      return;
    }

    // Set initial activity timestamp
    await this.updateActivity();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('[SessionManager] Initialized with timeout:', this.timeoutMinutes, 'minutes');
  }

  /**
   * Start monitoring session activity
   */
  private startMonitoring() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      await this.checkSession();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring session activity
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SessionManager] Stopped monitoring');
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    const now = Date.now();
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    
    // Reset warning flag when user is active
    if (this.warningShown) {
      this.warningShown = false;
      await AsyncStorage.removeItem(SESSION_WARNING_SHOWN_KEY);
    }
  }

  /**
   * Get last activity timestamp
   */
  private async getLastActivity(): Promise<number> {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return Date.now();
    }

    const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    return lastActivity ? parseInt(lastActivity, 10) : Date.now();
  }

  /**
   * Check if session has timed out
   */
  private async checkSession() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    const lastActivity = await this.getLastActivity();
    const now = Date.now();
    const inactiveMinutes = (now - lastActivity) / 1000 / 60;

    // Check if session has timed out
    if (inactiveMinutes >= this.timeoutMinutes) {
      console.log('[SessionManager] Session timed out after', inactiveMinutes.toFixed(1), 'minutes');
      await this.handleTimeout();
      return;
    }

    // Check if we should show warning
    const remainingMinutes = this.timeoutMinutes - inactiveMinutes;
    if (remainingMinutes <= this.warningMinutes && !this.warningShown) {
      console.log('[SessionManager] Session warning -', remainingMinutes.toFixed(1), 'minutes remaining');
      await this.handleWarning(Math.ceil(remainingMinutes));
    }
  }

  /**
   * Handle session timeout
   */
  private async handleTimeout() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    this.stopMonitoring();

    // Track security event
    trackSessionTimeout();

    // Sign out user
    await this.signOut();

    // Call custom callback if provided
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    } else {
      // Default behavior: show alert
      Alert.alert(
        'Session Expired',
        'Your session has expired due to inactivity. Please sign in again.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Handle session warning
   */
  private async handleWarning(remainingMinutes: number) {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    this.warningShown = true;
    await AsyncStorage.setItem(SESSION_WARNING_SHOWN_KEY, 'true');

    // Track security event
    trackSecurityEvent('session_warning', 'warning', { remainingMinutes });

    // Call custom callback if provided
    if (this.onWarningCallback) {
      this.onWarningCallback(remainingMinutes);
    } else {
      // Default behavior: show alert
      Alert.alert(
        'Session Expiring Soon',
        `Your session will expire in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} due to inactivity. Tap anywhere to stay signed in.`,
        [
          {
            text: 'Stay Signed In',
            onPress: async () => {
              await this.updateActivity();
            },
          },
        ]
      );
    }
  }

  /**
   * Sign out user and clear session data
   */
  private async signOut() {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear session data
      await AsyncStorage.multiRemove([
        LAST_ACTIVITY_KEY,
        SESSION_WARNING_SHOWN_KEY,
      ]);

      console.log('[SessionManager] User signed out and session data cleared');
    } catch (error) {
      console.error('[SessionManager] Error signing out:', error);
    }
  }

  /**
   * Manually trigger session timeout (for testing)
   */
  async forceTimeout() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    await this.handleTimeout();
  }

  /**
   * Reset session (useful when user signs in)
   */
  async reset() {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return;
    }

    this.warningShown = false;
    await AsyncStorage.multiRemove([
      LAST_ACTIVITY_KEY,
      SESSION_WARNING_SHOWN_KEY,
    ]);
    await this.updateActivity();
    console.log('[SessionManager] Session reset');
  }

  /**
   * Get remaining session time in minutes
   */
  async getRemainingTime(): Promise<number> {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return Number.POSITIVE_INFINITY;
    }

    const lastActivity = await this.getLastActivity();
    const now = Date.now();
    const inactiveMinutes = (now - lastActivity) / 1000 / 60;
    const remainingMinutes = this.timeoutMinutes - inactiveMinutes;
    return Math.max(0, remainingMinutes);
  }

  /**
   * Check if session is active
   */
  async isSessionActive(): Promise<boolean> {
    if (!ENABLE_INACTIVITY_TIMEOUT) {
      return true;
    }

    const remainingTime = await this.getRemainingTime();
    return remainingTime > 0;
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export singleton
export default sessionManager;

// Export class for custom instances
export { SessionManager };

