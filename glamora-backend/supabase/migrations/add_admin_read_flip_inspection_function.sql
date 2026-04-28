-- Migration: Admin-only function to inspect read flips (joins messages for context)

CREATE OR REPLACE FUNCTION public.admin_list_read_flips(
  p_since interval DEFAULT '30 days',
  p_receiver_id uuid DEFAULT NULL,
  p_message_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  message_id uuid,
  receiver_id uuid,
  changed_by uuid,
  old_is_read boolean,
  new_is_read boolean,
  changed_at timestamptz,
  sender_id uuid,
  message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.message_id, l.receiver_id, l.changed_by, l.old_is_read, l.new_is_read, l.changed_at,
         m.sender_id, m.message
  FROM public.messages_read_log l
  JOIN public.messages m ON m.id = l.message_id
  WHERE l.changed_at > now() - p_since
    AND (p_receiver_id IS NULL OR l.receiver_id = p_receiver_id)
    AND (p_message_id IS NULL OR l.message_id = p_message_id)
  ORDER BY l.changed_at DESC
$$;

-- Lock down access: only postgres and service_role can execute
REVOKE ALL ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) TO service_role;
