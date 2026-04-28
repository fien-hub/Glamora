# Trust, Safety, and Reliability – Plan + Audit (v1)

Scope covers: search, bookings, payments, messaging, verification docs, RLS/storage, location, performance, legal, testing/monitoring.

Notes: References point to files in glamora-backend and glamora-app as observed today. This doc defines the Definition of Done (DoD) for each fix area.

---

## 1) RLS and Access Control Hardening
Current:
- Base RLS in glamora-backend/supabase/rls-policies.sql; additional policies in migrations/*.
- Verification documents bucket has strict policies (migrations/create_verification_storage.sql).
Gaps:
- Some tables allow broad SELECT (profiles, customer_profiles). Confirm intended public fields; consider narrowing.
- Ensure UPDATE/DELETE always owner-scoped and system-only where relevant.
DoD:
- Owner-only INSERT/UPDATE/DELETE for profiles, bookings, portfolio, messages, etc.
- Public SELECT limited to safe entities (services/categories, visible portfolio, verified providers only).
- Storage buckets: default deny; explicit per-bucket policies reviewed; verification-documents stays private only with signed URLs.
- Add policy tests (SQL or backend integration) that prove denial for cross-tenant access.

## 2) Search Trust Improvements
Current:
- Customer SearchScreen: verifiedOnly default true; verified-first sort; badge shown.
  - glamora-app/src/screens/customer/SearchScreen.tsx: DEFAULT_FILTERS.verifiedOnly=true (around line ~73)
  - Sort by identity_verification_status approved first (~192–197); filter when verifiedOnly (~222–225); badge (~411, ~596).
DoD (Complete):
- Verified-only filter (default ON), verified-first sort, verified badge consistent in lists/cards.

## 3) Document Verification Safety
Current:
- Uploads to private bucket; signed URLs (1h) via verificationController.getDocumentUrl.
Gaps:
- No redacted thumbnails; no review/expiry reminders; no admin review UI.
DoD:
- Store originals private; generate redacted thumbnails (face/ID number masked) served via short-lived signed URLs (<15 min) or separate public-redacted bucket.
- Track document expiry/review dates; scheduled reminder jobs.
- Admin review workflow (approve/reject with reason) and audit logging.

## 4) Booking Concurrency and Policies
Current:
- App-level availability checks; no DB-level conflict prevention; no UTC normalization guaranteed.
DoD:
- DB exclusion constraint (e.g., tstzrange) or transactional check to prevent overlapping bookings (provider_id, [start,end)).
- All times stored in UTC; conversion handled client/server side.
- Cancellation windows/fees stored (provider policies exist); enforced in backend; surfaced in UI.
- Tests: race conditions, overlapping requests blocked.

## 5) Payments and Chargebacks
Current:
- Stripe PaymentIntent created; status recorded (pending). Capture method appears automatic by default.
DoD:
- Pre-authorize on booking (capture_method=manual), capture on completion; auto-cancel auth on timeout/cancel.
- Explicit checks to block off-platform hints (UI copy, ToS reminders in chat/booking screens).
- Dispute-pack export: receipts, chat logs snippet, location proof, completion logs; downloadable bundle.
- Webhooks update payment status; reconcile with bookings.

## 6) Messaging & Moderation
Current:
- Messages table + screens; no PII filter/rate-limit.
DoD:
- PII/unsafe content filter (basic regex + keyword list) server-side; reject or mask before insert.
- Rate-limit per user (e.g., 30 msgs/5 min) via middleware.
- Report/Block flows: tables for reports/blocks; endpoints + UI; blocked users can't message.
- Moderation queues for flagged content; admin review UI + audit trail.

## 7) Reviews Integrity
Current:
- Backend restricts to completed bookings; does not verify payment succeeded.
DoD:
- Only reviews for completed bookings with payments.status='succeeded'.
- Provider right-of-reply once per review; moderation for abusive content.
- Tests that unauthorized reviews fail.

## 8) Location Privacy & Battery
DoD:
- Server-side rate limit for location updates (<=1/min); mobile-side throttling + background settings.
- Blur provider location to customers (rounding/geohash precision) except during active booking route.
- Never expose customer live location to providers; only coarse ETA during en route.

## 9) Performance & Indexing
Current:
- Many useful indexes exist; pagination used in some places.
DoD:
- Add indexes: bookings(provider_id, scheduled_date/time), messages(receiver_id, created_at), reviews(provider_id, created_at).
- Paginate all list endpoints; enforce maximum page size.
- Background thumbnail generation for media; use CDN caching headers.

## 10) Legal & Compliance
DoD:
- Provider attestations (licensing/insurance) captured and stored; surfaced in profile.
- ToS/Privacy updates referencing on-platform payment requirement and data retention.
- Consent checkbox for uploads (face/ID processing) with retention policy summary.

## 11) Testing & Monitoring
DoD:
- Unit/integration tests for: RLS access, booking concurrency, payments state machine, messaging rate limits, review gating.
- E2E happy paths for: search->book->pay->chat->complete->review.
- Alerts on spikes in cancellations/disputes/verification failures; Sentry + metrics dashboards.

---

Execution order proposal:
1) Hardening (RLS audit quick fixes) -> 2) Booking concurrency -> 3) Payments capture flow -> 4) Messaging moderation -> 5) Reviews gating -> 6) Docs safety -> 7) Location -> 8) Perf/Indexing -> 9) Legal -> 10) Tests/E2E.

