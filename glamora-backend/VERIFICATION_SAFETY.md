# ✅ Verification Safety Guide

A short, practical guide for safely verifying Glamora without risking data or environments. Use this whenever you "make sure it works/builds/tests".

---

## Core Principles (Read First)

1) Prefer safe-by-default checks
- Build/type-check, lint, unit tests, and read-only queries are safe.
- Avoid actions that change state unless explicitly permitted.

2) Smallest thing that proves correctness
- Run the smallest, fastest command that gives a reliable signal.
- Treat success as: exit code 0 and no obvious errors in logs.

3) Local/dev only
- Never point checks at production. Use your local dev setup or a dedicated test project.

4) No installs/changes without permission
- Do not run package manager commands, migrations, or deployments unless explicitly approved.

---

## Backend (Node/Express) – Safe Checks

Run from: glamora-backend/

- Type check (fast, no emit)
```bash
npx tsc --noEmit
```

- Lint
```bash
npm run lint
```

- Build (compiles TypeScript)
```bash
npm run build
```

- Unit tests (smallest scope → file → all)
```bash
# Single test by name
npx jest -t "name of test"

# Single test file
npx jest path/to/file.test.ts

# All tests
npm test
```

Success criteria
- Exit code 0
- No stack traces or error lines in output

---

## Mobile App (React Native/Expo) – Safe Checks

Run from: glamora-app/

- Type check
```bash
npm run type-check
```

- Lint
```bash
npm run lint
```

- Unit tests
```bash
npm test
```

- Optional E2E (emulator required; non-destructive)
```bash
npm run test:e2e            # full suite
npm run test:e2e:auth       # focused flows
```

Success criteria
- Exit code 0
- Test runner shows all green

---

## Supabase – Read-Only Verification

Use the Dashboard SQL Editor or your local dev project. Prefer read-only SELECTs to confirm schema, policies, and views.

Examples
```sql
-- List RLS policies on a table
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'customer_profiles'
ORDER BY policyname;

-- Check if a table/view exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'notifications';

-- Quick row count (safe)
SELECT count(*) FROM public.notifications;
```

Avoid in production
- INSERT/UPDATE/DELETE
- Schema changes (DDL)
- Secrets exposure (never paste service keys into source)

---

## Safe Smoke Checks (Optional)

- Start backend locally and observe logs only (no destructive calls)
- If a health endpoint exists, curl it locally
```bash
# Example only (if implemented)
curl -i http://localhost:3000/health
```
- Do not POST/DELETE to production APIs

---

## Troubleshooting Safely

- If a command fails, capture: command, cwd, exit code, and key log lines.
- Try the smaller scope first (single test → file → suite).
- Stop when errors indicate configuration or credentials; don’t guess with prod resources.

---

## Quick Checklist

- [ ] Ran type checks (backend/app)
- [ ] Ran lint (backend/app)
- [ ] Ran smallest necessary tests
- [ ] Used read-only SQL for Supabase verification
- [ ] Avoided installs/migrations/deployments without approval
- [ ] Verified success via exit code 0 and clean logs

---

Notes
- For any action that modifies state, get explicit approval first.
- Keep secrets in env vars; never commit or print service keys.

