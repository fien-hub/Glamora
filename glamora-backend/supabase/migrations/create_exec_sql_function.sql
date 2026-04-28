-- Create a safe SQL execution helper for service_role migrations
-- Purpose: Allow internal scripts using SUPABASE_SERVICE_KEY to run idempotent SQL statements
-- Security: Only service_role may EXECUTE; PUBLIC/anon/authenticated are revoked

-- Drop old version if it exists to keep idempotency
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Create function
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Execute the provided statement. Each call should pass a single statement.
  EXECUTE sql_query;
END;
$$;

-- Lock down privileges
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE ALL ON FUNCTION public.exec_sql(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
