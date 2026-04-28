-- Migration: Add UPDATE policy for messages and restrict updates to is_read only
-- Purpose: Allow receivers to mark messages as read while preventing modification of other fields

-- Ensure RLS is enabled (idempotent; messages RLS is enabled in prior migrations)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
CREATE POLICY "Users can update received messages" ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create trigger function to restrict updatable fields to is_read only
CREATE OR REPLACE FUNCTION enforce_messages_update_fields()
RETURNS trigger AS $$
BEGIN
  -- Only allow toggling of is_read; all other fields must remain unchanged
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
  THEN
    RAISE EXCEPTION 'Only is_read may be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS messages_update_restrict ON public.messages;
CREATE TRIGGER messages_update_restrict
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION enforce_messages_update_fields();

