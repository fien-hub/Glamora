# Migration Checklist (Known-Good Splash Baseline)

Date: 2026-05-22
Target repo: /Users/twin1/Documents/Glamora/glamora-app
Legacy source copy: /Users/twin1/Documents/Glamora/src

## Baseline Safety Anchors
- Known-good commit: `61ff4e1e4`
- Backup branch: `backup/testflight-pass-2026-05-22`
- Tag: `testflight-splash-pass-2026-05-22`

## Migration Rule
- Preserve startup stability first.
- Port only behavior-level improvements from legacy copy.
- Avoid reverting stability wrappers (safe imports/icons/gradients/haptics/calendar/video fallbacks).

## High-Value Area Audit (Started)

### 1) Auth + Verification + Onboarding Gates
Status: reviewed

Files reviewed:
- `src/contexts/AuthContext.tsx`
- `src/navigation/index.tsx`
- `src/screens/auth/SignupScreen.tsx`
- `src/screens/auth/AccountVerificationScreen.tsx`
- `src/screens/onboarding/PersonalizationScreen.tsx`

Decisions:
- Keep current `AuthContext.tsx` logic in glamora-app copy.
  - It has stronger handling for network/token-refresh edge cases.
  - It includes verification-first signup gating for new accounts.
- Keep current `AccountVerificationScreen.tsx` in glamora-app copy.
  - It re-reads onboarding state from DB before routing, reducing stale-context misroutes.
- Keep current `PersonalizationScreen.tsx` in glamora-app copy.
  - It uses upsert and routes to AppRating after completion/skip.
- Keep `navigation/index.tsx` AppRating route in glamora-app copy.

Result:
- No auth/onboarding rollback from legacy copy should be applied.
- Current copy is newer and safer for production flow.

### 2) Booking + Discovery Surfaces
Status: reviewed (first pass)

Files reviewed:
- `src/screens/customer/BookingFlowScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`
- `src/screens/customer/BookingsScreen.tsx`
- `src/screens/customer/PostDetailScreen.tsx`
- `src/screens/customer/ProviderPortfolioScreen.tsx`
- `src/screens/customer/SavedPostsScreen.tsx`
- `src/screens/customer/SearchScreen.tsx`
- `src/screens/customer/HomeScreen.tsx`

Decisions:
- Keep current glamora-app imports/wrappers:
  - `utils/icons`
  - `utils/linearGradient`
  - `utils/haptics`
  - guarded calendar/video/image usage where present
- Do not port legacy direct native imports in these screens.
  - Legacy copy uses direct module imports more often and is less resilient on startup/runtime.

Result:
- No booking/discovery code has been ported from legacy in this batch.
- Current copy remains the source of truth for stability.

## Next Batches
1. Payment and checkout paths (customer + provider payout screens)
2. Messaging and media rendering paths
3. Admin/provider dashboards and analytics screens
4. Non-functional/UI polish-only differences

## Merge Protocol for Every Future Batch
1. Diff only one feature area.
2. Port minimal changes to glamora-app copy.
3. Run local smoke checks for that area.
4. Ship one EAS build if behavior risk is medium/high.
5. Keep this checklist updated with decisions and reasons.
