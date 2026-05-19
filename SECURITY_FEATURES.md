# Advanced Security Features

## Overview

Glamora implements comprehensive security features to protect user accounts and data, including session timeout handling, API rate limiting, suspicious activity detection, and security event logging.

## Features

### 1. **Session Timeout Management**

Automatic session timeout after a period of inactivity to protect user accounts.

#### Configuration
- **Timeout Duration:** 30 minutes of inactivity (configurable)
- **Warning Period:** 5 minutes before timeout (configurable)
- **Check Interval:** Every 60 seconds

#### How It Works
1. Session manager tracks last user activity timestamp
2. Monitors activity every minute
3. Shows warning 5 minutes before timeout
4. Automatically signs out user after 30 minutes of inactivity
5. Clears all session data on timeout

#### User Experience
- **Warning Alert:** "Your session will expire in X minutes due to inactivity"
- **Timeout Alert:** "Your session has expired. Please sign in again"
- **Activity Tracking:** Updates on app state changes (foreground/background)

#### Implementation Files
- `glamora-app/src/utils/sessionManager.ts` - Session management utility
- `glamora-app/src/contexts/AuthContext.tsx` - Integration with authentication

### 2. **API Rate Limiting**

Protects backend APIs from abuse and DDoS attacks with intelligent rate limiting.

#### Rate Limit Configurations

| Endpoint Type | Window | Max Requests | Description |
|--------------|--------|--------------|-------------|
| **General API** | 15 min | 100 | All API endpoints |
| **Authentication** | 15 min | 5 | Login/signup endpoints |
| **Payments** | 1 hour | 10 | Payment processing |
| **Bookings** | 1 hour | 20 | Booking creation |
| **Messages** | 15 min | 50 | Message sending |
| **File Uploads** | 1 hour | 30 | File uploads |
| **Search** | 15 min | 60 | Search queries |

#### Response Headers
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Remaining requests in window
- `RateLimit-Reset` - Time when limit resets

#### Error Response (429 Too Many Requests)
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": "2024-01-15T10:30:00Z"
}
```

#### Implementation Files
- `glamora-backend/src/middleware/rateLimiter.ts` - Rate limiting middleware
- `glamora-backend/src/server.ts` - Applied to routes

### 3. **Suspicious Activity Detection**

Monitors user behavior patterns to detect and prevent suspicious activities.

#### Detection Patterns

**Login Patterns:**
- ✅ Multiple failed login attempts (5+ in 15 minutes)
- ✅ Logins from multiple different IPs (5+ in 1 hour)
- ✅ Rapid login attempts (10+ in 5 minutes)

**Booking Patterns:**
- ✅ Rapid booking cancellations (5+ in 1 hour)
- ✅ Rapid booking creation (10+ in 1 hour)

**Payment Patterns:**
- ✅ Multiple failed payment attempts
- ✅ Unusual payment amounts or patterns

#### Actions Taken
1. **Log Security Event** - Record suspicious activity in audit log
2. **Create Alert** - Generate alert for review
3. **Account Lock** - Temporarily lock account after 5 failed login attempts (15 min)
4. **Notify User** - Send notification about suspicious activity (future enhancement)

#### Implementation Files
- `glamora-backend/supabase/migrations/add_security_audit_log.sql` - Database schema
- `glamora-backend/src/utils/securityMonitor.ts` - Security monitoring utility

### 4. **Security Event Logging**

Comprehensive audit log for all security-related events.

#### Event Types

**Authentication Events:**
- `login_success` - Successful login
- `login_failed` - Failed login attempt
- `login_suspicious` - Suspicious login pattern detected
- `logout` - User logout
- `password_change` - Password changed
- `password_reset_request` - Password reset requested
- `password_reset_success` - Password reset completed
- `account_locked` - Account locked due to suspicious activity
- `account_unlocked` - Account unlocked
- `session_timeout` - Session expired due to inactivity

**Security Events:**
- `rate_limit_exceeded` - API rate limit exceeded
- `unauthorized_access` - Unauthorized access attempt
- `suspicious_activity_detected` - Suspicious pattern detected
- `ip_address_changed` - Login from new IP address
- `device_changed` - Login from new device

**Business Events:**
- `booking_created` - Booking created
- `booking_cancelled` - Booking cancelled
- `booking_rapid_cancellation` - Rapid cancellation detected
- `payment_success` - Payment successful
- `payment_failed` - Payment failed
- `payment_suspicious` - Suspicious payment pattern
- `profile_updated` - Profile information updated
- `security_settings_changed` - Security settings modified

#### Event Severity Levels
- **Info** - Normal operations (login_success, booking_created)
- **Warning** - Potential issues (login_failed, payment_failed)
- **Critical** - Security threats (account_locked, suspicious_activity_detected)

#### Database Schema

**`security_audit_log` Table:**
```sql
- id (UUID)
- user_id (UUID) - References auth.users
- event_type (security_event_type enum)
- event_description (TEXT)
- ip_address (INET)
- user_agent (TEXT)
- device_info (JSONB)
- location_info (JSONB)
- metadata (JSONB)
- severity (VARCHAR) - info, warning, critical
- is_suspicious (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

**`failed_login_attempts` Table:**
```sql
- id (UUID)
- email (VARCHAR)
- ip_address (INET)
- user_agent (TEXT)
- attempt_count (INTEGER)
- first_attempt_at (TIMESTAMPTZ)
- last_attempt_at (TIMESTAMPTZ)
- is_locked (BOOLEAN)
- locked_until (TIMESTAMPTZ)
```

**`suspicious_activity_alerts` Table:**
```sql
- id (UUID)
- user_id (UUID)
- alert_type (VARCHAR)
- alert_description (TEXT)
- severity (VARCHAR) - warning, critical
- metadata (JSONB)
- is_resolved (BOOLEAN)
- resolved_at (TIMESTAMPTZ)
- resolved_by (UUID)
```

## Usage Examples

### Frontend - Track Security Events

```typescript
import { trackLoginAttempt, trackSessionTimeout, trackSuspiciousActivity } from '../utils/analytics';

// Track login attempt
trackLoginAttempt(true, 'email'); // Success
trackLoginAttempt(false, 'google'); // Failed

// Track session timeout
trackSessionTimeout();

// Track suspicious activity
trackSuspiciousActivity('rapid_booking_cancellation', {
  bookingCount: 5,
  timeWindow: '1 hour'
});
```

### Backend - Log Security Events

```typescript
import securityMonitor from '../utils/securityMonitor';

// Log security event
await securityMonitor.logEvent({
  userId: user.id,
  eventType: 'login_success',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  severity: 'info'
});

// Track failed login
const isLocked = await securityMonitor.trackFailedLogin(
  email,
  req.ip,
  req.get('user-agent')
);

// Check if account is locked
const locked = await securityMonitor.isAccountLocked(email, req.ip);

// Check for suspicious patterns
const suspicious = await securityMonitor.checkSuspiciousLoginPattern(
  userId,
  req.ip
);
```

## Security Best Practices

### For Users
1. **Use Strong Passwords** - Minimum 8 characters with mix of letters, numbers, symbols
2. **Enable 2FA** - Add extra layer of security with two-factor authentication
3. **Monitor Activity** - Review security audit logs regularly
4. **Report Suspicious Activity** - Contact support if you notice unusual activity

### For Developers
1. **Never Log Sensitive Data** - Don't log passwords, tokens, or payment details
2. **Use Environment Variables** - Store secrets in environment variables
3. **Implement RLS Policies** - Use Row Level Security for database access
4. **Regular Security Audits** - Review security logs and alerts regularly
5. **Keep Dependencies Updated** - Update packages to patch security vulnerabilities

## Configuration

### Environment Variables

**Backend (.env):**
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Frontend (.env):**
```bash
# Session Timeout
SESSION_TIMEOUT_MINUTES=30
SESSION_WARNING_MINUTES=5
```

## Monitoring and Alerts

### View Security Audit Logs

```sql
-- Recent security events
SELECT * FROM security_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- Suspicious activities
SELECT * FROM security_audit_log
WHERE is_suspicious = TRUE
ORDER BY created_at DESC;

-- Failed login attempts
SELECT * FROM failed_login_attempts
WHERE is_locked = TRUE;

-- Unresolved alerts
SELECT * FROM suspicious_activity_alerts
WHERE is_resolved = FALSE
ORDER BY created_at DESC;
```

### Cleanup Old Logs

```sql
-- Clean up logs older than 90 days (keeps suspicious and critical logs)
SELECT cleanup_old_security_logs();
```

## Future Enhancements

1. **Email Notifications** - Send alerts for suspicious activities
2. **IP Geolocation** - Track login locations and detect unusual patterns
3. **Device Fingerprinting** - Identify and track devices
4. **Biometric Re-authentication** - Require biometric auth for sensitive actions
5. **Security Dashboard** - Admin dashboard for monitoring security events
6. **Automated Responses** - Automatically block IPs with repeated violations
7. **Machine Learning** - Use ML to detect anomalous behavior patterns
8. **Compliance Reports** - Generate security compliance reports

## Support

For security concerns or to report vulnerabilities:
- Email: security@glamora.com
- Bug Bounty Program: Coming soon

## License

This security implementation is part of the Glamora platform and is proprietary.

