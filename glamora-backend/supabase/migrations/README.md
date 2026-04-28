# Supabase RLS policies and migrations (Glamora)

This folder contains idempotent SQL migrations for enabling RLS and defining policies on these tables:
- public.profiles
- public.bookings
- public.reviews
- public.provider_time_off

The SQL uses DROP POLICY IF EXISTS + CREATE POLICY, so it is safe to run multiple times (e.g., in CI or via the Supabase SQL editor).

## How to apply (fast + simple)

Option A — Supabase Dashboard (SQL Editor):
1) Open your project → SQL Editor
2) Paste the contents of the migration file you want to apply
3) Run

Option B — Supabase Management API (used by our automation):
- POST /v1/projects/{project_id}/database/query with a JSON body:
  {
    "query": "<your SQL here>"
  }

## What each migration does

profiles (harden_profiles_select.sql)
- Enables RLS
- Replaces any broad/legacy policy with:
  CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

bookings (harden_bookings_update_policies.sql)
- Enables RLS
- Drops the broad update policy
- Adds two specific UPDATE policies:
  1) Customers can cancel their own bookings (status must become 'cancelled')
  2) Providers can update status on their own bookings (confirmed/in_progress/completed/cancelled)

reviews (harden_reviews_insert_require_completed.sql)
- Enables RLS
- Allows INSERT only if the booking is completed and owned by the inserting customer, with matching identities

provider_time_off (add_provider_time_off_select_policy.sql)
- Enables RLS
- Allows SELECT to authenticated users (read-only) for availability checks

## Quick verification SQL

You can run this to confirm policies exist and RLS is enabled:

SELECT 'policies'::text as kind, tablename, policyname, cmd, roles::text[] as roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('profiles','bookings','reviews','provider_time_off')
UNION ALL
SELECT 'rls'::text as kind, c.relname as tablename, NULL::text as policyname, NULL::text as cmd,
       CASE WHEN c.relrowsecurity THEN ARRAY['enabled']::text[] ELSE ARRAY['disabled']::text[] END as roles
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('profiles','bookings','reviews','provider_time_off')
ORDER BY kind, tablename, policyname NULLS LAST;

## Notes
- These statements are safe to re-run.
- If you add new roles or change table names, update the policy definitions accordingly.

