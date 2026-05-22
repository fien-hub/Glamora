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

## High-Value Area Audit (In Progress)

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

### 3) Payment + Checkout Paths
Status: reviewed

Files reviewed:
- `src/components/PaymentVerificationPrompt.tsx`
- `src/components/BookingModal.tsx`
- `src/components/BookingConfirmationModal.tsx`
- `src/screens/customer/BookingFlowScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`
- `src/screens/customer/BookingsScreen.tsx`
- `src/screens/provider/EarningsScreen.tsx`
- `src/screens/provider/MyCustomerBookingsScreen.tsx`

Decisions:
- Keep current glamora-app implementation.
- Diffs are primarily resiliency imports/fallbacks (`utils/icons`, guarded calendar/web-browser/haptics usage).
- No business-rule payment logic in legacy copy was found to be newer than current.

Result:
- No payment/checkout code is ported from legacy copy in this batch.
- Current copy remains safer for production startup/runtime behavior.

### 4) Messaging + Media Rendering Paths
Status: reviewed

Files reviewed:
- `src/screens/shared/ChatScreen.tsx`
- `src/screens/customer/MessagesScreen.tsx`
- `src/screens/provider/MessagesScreen.tsx`
- `src/components/FeedPostCard.tsx`
- `src/utils/imageUpload.ts`
- `src/screens/provider/CreatePostScreen.tsx`
- `src/screens/provider/PortfolioScreen.tsx`
- `src/components/DocumentUpload.tsx`

Decisions:
- Keep current glamora-app implementation.
- Current copy includes lazy native-module loading and guarded fallbacks (image picker, file system, sharing, media library, expo-image).
- Preserve optional distance rendering behavior in `FeedPostCard` (show tag only when distance is known).

Result:
- No messaging/media rollback from legacy copy should be applied.
- Current copy is more resilient in production environments.

### 5) Provider/Admin Dashboards + Analytics
Status: reviewed

Files reviewed:
- `src/screens/provider/AnalyticsScreen.tsx`
- `src/screens/provider/ProfileScreen.tsx`
- `src/screens/provider/KYCVerificationScreen.tsx`
- `src/screens/provider/NotificationSettingsScreen.tsx`
- `src/screens/provider/TravelSettingsScreen.tsx`
- `src/navigation/ProviderTabNavigator.tsx`
- `src/navigation/AdminTabNavigator.tsx`

Decisions:
- Keep current glamora-app implementation.
- Differences are mostly icon/native-import hardening and safe fallback patterns (for example guarded `react-native-svg` usage in analytics).
- No confirmed newer business-flow logic in legacy copy to port.

Result:
- No provider/admin dashboard code is ported from legacy copy in this batch.
- Current copy remains the preferred baseline.

### 6) Non-Functional / UI Polish Differences
Status: reviewed

Files reviewed:
- `src/screens/auth/WelcomeScreen.tsx`
- `src/screens/auth/OnboardingScreen.tsx`
- `src/screens/auth/RoleSelectionScreen.tsx`
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/SignupScreen.tsx`
- `src/screens/customer/HomeScreen.tsx`
- `src/screens/customer/SearchScreen.tsx`
- `src/screens/customer/SavedPostsScreen.tsx`
- `src/screens/customer/BookingsScreen.tsx`
- `src/components/BookingConfirmationAnimation.tsx`
- `src/components/BookingConfirmationModal.tsx`

Decisions:
- Keep current glamora-app copy for all reviewed UI files.
- Most differences are stability wrappers (`utils/icons`, guarded module imports) or already-improved UX behavior in current copy.
- Do not port legacy HomeScreen decorative scallop column back in; current copy intentionally removed it and keeps cleaner hero layout.
- Keep current Search distance rendering (show only when distance exists) to avoid noisy `N/A` text in UI.

Result:
- Final UI-polish batch complete with no legacy ports applied.
- Migration focus can now shift to optional, explicitly requested feature additions only.

## Next Batches
1. Optional feature additions that are not startup-critical
2. Regression test pass per user role after each optional port

## Merge Protocol for Every Future Batch
1. Diff only one feature area.
2. Port minimal changes to glamora-app copy.
3. Run local smoke checks for that area.
4. Ship one EAS build if behavior risk is medium/high.
5. Keep this checklist updated with decisions and reasons.
