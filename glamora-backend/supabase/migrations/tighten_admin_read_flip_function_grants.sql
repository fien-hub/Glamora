-- Migration: Tighten EXECUTE grants on admin_list_read_flips
REVOKE EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_list_read_flips(interval, uuid, uuid) TO service_role;
