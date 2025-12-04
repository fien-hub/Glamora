-- Create security event types enum
CREATE TYPE security_event_type AS ENUM (
  'login_success',
  'login_failed',
  'login_suspicious',
  'logout',
  'password_change',
  'password_reset_request',
  'password_reset_success',
  'account_locked',
  'account_unlocked',
  'session_timeout',
  'rate_limit_exceeded',
  'unauthorized_access',
  'booking_created',
  'booking_cancelled',
  'booking_rapid_cancellation',
  'payment_success',
  'payment_failed',
  'payment_suspicious',
  'profile_updated',
  'security_settings_changed',
  'suspicious_activity_detected',
  'ip_address_changed',
  'device_changed'
);

-- Create security_audit_log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type security_event_type NOT NULL,
    event_description TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    metadata JSONB,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_log_is_suspicious ON public.security_audit_log(is_suspicious) WHERE is_suspicious = TRUE;
CREATE INDEX idx_security_audit_log_severity ON public.security_audit_log(severity);
CREATE INDEX idx_security_audit_log_ip_address ON public.security_audit_log(ip_address);

-- Create failed_login_attempts table for tracking login failures
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for failed login attempts
CREATE INDEX idx_failed_login_attempts_email ON public.failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_ip_address ON public.failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_is_locked ON public.failed_login_attempts(is_locked) WHERE is_locked = TRUE;

-- Create suspicious_activity_alerts table
CREATE TABLE IF NOT EXISTS public.suspicious_activity_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    alert_description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning', -- warning, critical
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for suspicious activity alerts
CREATE INDEX idx_suspicious_activity_alerts_user_id ON public.suspicious_activity_alerts(user_id);
CREATE INDEX idx_suspicious_activity_alerts_is_resolved ON public.suspicious_activity_alerts(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_suspicious_activity_alerts_severity ON public.suspicious_activity_alerts(severity);
CREATE INDEX idx_suspicious_activity_alerts_created_at ON public.suspicious_activity_alerts(created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all security tables
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

-- Security audit log policies
-- Users can view their own security logs
CREATE POLICY "Users can view their own security audit logs"
ON public.security_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Only system/admin can insert security logs (handled by backend)
CREATE POLICY "System can insert security audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- Failed login attempts policies
-- No direct user access (handled by backend)
CREATE POLICY "System can manage failed login attempts"
ON public.failed_login_attempts
FOR ALL
USING (true)
WITH CHECK (true);

-- Suspicious activity alerts policies
-- Users can view their own alerts
CREATE POLICY "Users can view their own suspicious activity alerts"
ON public.suspicious_activity_alerts
FOR SELECT
USING (auth.uid() = user_id);

-- Only system can create alerts
CREATE POLICY "System can create suspicious activity alerts"
ON public.suspicious_activity_alerts
FOR INSERT
WITH CHECK (true);

-- Function to clean up old security logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.security_audit_log
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND severity = 'info'
  AND is_suspicious = FALSE;
  
  -- Keep suspicious logs and critical logs indefinitely
END;
$$;

-- Function to check for suspicious login patterns
CREATE OR REPLACE FUNCTION check_suspicious_login_pattern(
  p_user_id UUID,
  p_ip_address INET
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failed_count INTEGER;
  different_ips INTEGER;
  rapid_attempts INTEGER;
BEGIN
  -- Check for multiple failed attempts in last 15 minutes
  SELECT COUNT(*)
  INTO failed_count
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND event_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '15 minutes';
  
  IF failed_count >= 5 THEN
    RETURN TRUE;
  END IF;
  
  -- Check for logins from multiple different IPs in last hour
  SELECT COUNT(DISTINCT ip_address)
  INTO different_ips
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND event_type IN ('login_success', 'login_failed')
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF different_ips >= 5 THEN
    RETURN TRUE;
  END IF;
  
  -- Check for rapid login attempts (more than 10 in 5 minutes)
  SELECT COUNT(*)
  INTO rapid_attempts
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND event_type IN ('login_success', 'login_failed')
  AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF rapid_attempts >= 10 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to check for suspicious booking patterns
CREATE OR REPLACE FUNCTION check_suspicious_booking_pattern(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rapid_cancellations INTEGER;
  rapid_bookings INTEGER;
BEGIN
  -- Check for rapid booking cancellations (more than 5 in 1 hour)
  SELECT COUNT(*)
  INTO rapid_cancellations
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND event_type = 'booking_cancelled'
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF rapid_cancellations >= 5 THEN
    RETURN TRUE;
  END IF;
  
  -- Check for rapid booking creation (more than 10 in 1 hour)
  SELECT COUNT(*)
  INTO rapid_bookings
  FROM public.security_audit_log
  WHERE user_id = p_user_id
  AND event_type = 'booking_created'
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF rapid_bookings >= 10 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.security_audit_log IS 'Comprehensive security audit log for tracking all security-related events';
COMMENT ON TABLE public.failed_login_attempts IS 'Tracks failed login attempts for account protection';
COMMENT ON TABLE public.suspicious_activity_alerts IS 'Stores alerts for suspicious activities that require attention';
COMMENT ON FUNCTION check_suspicious_login_pattern IS 'Checks if a user login pattern is suspicious';
COMMENT ON FUNCTION check_suspicious_booking_pattern IS 'Checks if a user booking pattern is suspicious';

