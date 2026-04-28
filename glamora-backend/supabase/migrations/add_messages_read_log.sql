-- Migration: Add messages_read_log and trigger to audit is_read flips
-- Purpose: Provide an admin-only audit trail whenever a message is marked as read

-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.messages_read_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_is_read BOOLEAN,
  new_is_read BOOLEAN,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_messages_read_log_message ON public.messages_read_log(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_log_receiver ON public.messages_read_log(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_log_changed_at ON public.messages_read_log(changed_at DESC);

-- 2) Enable RLS and restrict client access (admins/service role can still access)
ALTER TABLE public.messages_read_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System only can view messages read log" ON public.messages_read_log;
CREATE POLICY "System only can view messages read log"
  ON public.messages_read_log
  FOR SELECT
  USING (false);

-- 3) Trigger to log flips from false -> true
CREATE OR REPLACE FUNCTION log_message_is_read_flip()
RETURNS TRIGGER AS $$
BEGIN
  -- Log only when is_read changes from false to true
  IF (OLD.is_read IS DISTINCT FROM NEW.is_read) AND COALESCE(OLD.is_read, false) = false AND COALESCE(NEW.is_read, false) = true THEN
    INSERT INTO public.messages_read_log (message_id, receiver_id, changed_by, old_is_read, new_is_read)
    VALUES (OLD.id, OLD.receiver_id, auth.uid(), OLD.is_read, NEW.is_read);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_is_read_audit ON public.messages;
CREATE TRIGGER messages_is_read_audit
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION log_message_is_read_flip();

