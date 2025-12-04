import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'login_suspicious'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_timeout'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_rapid_cancellation'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_suspicious'
  | 'profile_updated'
  | 'security_settings_changed'
  | 'suspicious_activity_detected'
  | 'ip_address_changed'
  | 'device_changed';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityEventData {
  userId?: string;
  eventType: SecurityEventType;
  eventDescription?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  locationInfo?: any;
  metadata?: any;
  severity?: SecuritySeverity;
  isSuspicious?: boolean;
}

class SecurityMonitor {
  /**
   * Log a security event
   */
  async logEvent(data: SecurityEventData): Promise<void> {
    try {
      const { error } = await supabase.from('security_audit_log').insert({
        user_id: data.userId || null,
        event_type: data.eventType,
        event_description: data.eventDescription || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        device_info: data.deviceInfo || null,
        location_info: data.locationInfo || null,
        metadata: data.metadata || null,
        severity: data.severity || 'info',
        is_suspicious: data.isSuspicious || false,
      });

      if (error) {
        console.error('[SecurityMonitor] Error logging security event:', error);
      } else {
        console.log(`[SecurityMonitor] Logged ${data.eventType} event for user ${data.userId || 'anonymous'}`);
      }
    } catch (error) {
      console.error('[SecurityMonitor] Exception logging security event:', error);
    }
  }

  /**
   * Log event from Express request
   */
  async logEventFromRequest(
    req: Request,
    eventType: SecurityEventType,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata,
      severity: this.getSeverityForEventType(eventType),
    });
  }

  /**
   * Track failed login attempt
   */
  async trackFailedLogin(email: string, ipAddress: string, userAgent?: string): Promise<boolean> {
    try {
      // Check if there's an existing record for this email/IP
      const { data: existing, error: fetchError } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .eq('email', email)
        .eq('ip_address', ipAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('[SecurityMonitor] Error fetching failed login attempts:', fetchError);
        return false;
      }

      if (existing) {
        // Update existing record
        const newCount = existing.attempt_count + 1;
        const shouldLock = newCount >= 5;

        const { error: updateError } = await supabase
          .from('failed_login_attempts')
          .update({
            attempt_count: newCount,
            last_attempt_at: new Date().toISOString(),
            is_locked: shouldLock,
            locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[SecurityMonitor] Error updating failed login attempts:', updateError);
        }

        return shouldLock;
      } else {
        // Create new record
        const { error: insertError } = await supabase.from('failed_login_attempts').insert({
          email,
          ip_address: ipAddress,
          user_agent: userAgent,
          attempt_count: 1,
        });

        if (insertError) {
          console.error('[SecurityMonitor] Error inserting failed login attempt:', insertError);
        }

        return false;
      }
    } catch (error) {
      console.error('[SecurityMonitor] Exception tracking failed login:', error);
      return false;
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(email: string, ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('failed_login_attempts')
        .select('is_locked, locked_until')
        .eq('email', email)
        .eq('ip_address', ipAddress)
        .single();

      if (error || !data) {
        return false;
      }

      if (data.is_locked && data.locked_until) {
        const lockedUntil = new Date(data.locked_until);
        if (lockedUntil > new Date()) {
          return true;
        } else {
          // Lock expired, unlock the account
          await this.unlockAccount(email, ipAddress);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('[SecurityMonitor] Exception checking account lock:', error);
      return false;
    }
  }

  /**
   * Unlock account
   */
  async unlockAccount(email: string, ipAddress: string): Promise<void> {
    try {
      await supabase
        .from('failed_login_attempts')
        .update({
          is_locked: false,
          locked_until: null,
          attempt_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .eq('ip_address', ipAddress);

      console.log(`[SecurityMonitor] Unlocked account for ${email}`);
    } catch (error) {
      console.error('[SecurityMonitor] Exception unlocking account:', error);
    }
  }

  /**
   * Reset failed login attempts (after successful login)
   */
  async resetFailedAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      await supabase
        .from('failed_login_attempts')
        .delete()
        .eq('email', email)
        .eq('ip_address', ipAddress);

      console.log(`[SecurityMonitor] Reset failed attempts for ${email}`);
    } catch (error) {
      console.error('[SecurityMonitor] Exception resetting failed attempts:', error);
    }
  }

  /**
   * Create suspicious activity alert
   */
  async createAlert(
    userId: string,
    alertType: string,
    alertDescription: string,
    severity: 'warning' | 'critical' = 'warning',
    metadata?: any
  ): Promise<void> {
    try {
      const { error } = await supabase.from('suspicious_activity_alerts').insert({
        user_id: userId,
        alert_type: alertType,
        alert_description: alertDescription,
        severity,
        metadata: metadata || null,
      });

      if (error) {
        console.error('[SecurityMonitor] Error creating alert:', error);
      } else {
        console.warn(`[SecurityMonitor] Created ${severity} alert for user ${userId}: ${alertType}`);
      }
    } catch (error) {
      console.error('[SecurityMonitor] Exception creating alert:', error);
    }
  }

  /**
   * Check for suspicious login pattern
   */
  async checkSuspiciousLoginPattern(userId: string, ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_suspicious_login_pattern', {
        p_user_id: userId,
        p_ip_address: ipAddress,
      });

      if (error) {
        console.error('[SecurityMonitor] Error checking suspicious login pattern:', error);
        return false;
      }

      if (data === true) {
        await this.createAlert(
          userId,
          'suspicious_login_pattern',
          'Suspicious login pattern detected: multiple failed attempts or unusual IP activity',
          'warning',
          { ip_address: ipAddress }
        );
      }

      return data === true;
    } catch (error) {
      console.error('[SecurityMonitor] Exception checking suspicious login pattern:', error);
      return false;
    }
  }

  /**
   * Check for suspicious booking pattern
   */
  async checkSuspiciousBookingPattern(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_suspicious_booking_pattern', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[SecurityMonitor] Error checking suspicious booking pattern:', error);
        return false;
      }

      if (data === true) {
        await this.createAlert(
          userId,
          'suspicious_booking_pattern',
          'Suspicious booking pattern detected: rapid booking creation or cancellations',
          'warning'
        );
      }

      return data === true;
    } catch (error) {
      console.error('[SecurityMonitor] Exception checking suspicious booking pattern:', error);
      return false;
    }
  }

  /**
   * Get severity level for event type
   */
  private getSeverityForEventType(eventType: SecurityEventType): SecuritySeverity {
    const criticalEvents: SecurityEventType[] = [
      'account_locked',
      'login_suspicious',
      'payment_suspicious',
      'suspicious_activity_detected',
      'unauthorized_access',
    ];

    const warningEvents: SecurityEventType[] = [
      'login_failed',
      'password_reset_request',
      'rate_limit_exceeded',
      'booking_rapid_cancellation',
      'payment_failed',
      'ip_address_changed',
      'device_changed',
    ];

    if (criticalEvents.includes(eventType)) {
      return 'critical';
    } else if (warningEvents.includes(eventType)) {
      return 'warning';
    } else {
      return 'info';
    }
  }
}

// Export singleton instance
const securityMonitor = new SecurityMonitor();
export default securityMonitor;

