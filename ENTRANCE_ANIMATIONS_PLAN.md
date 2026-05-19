# Entrance Animations Implementation Plan

## 📋 Overview

This document outlines a comprehensive plan to add entrance animations (fade-in, slide-up, scale) to all cards and text elements throughout the Glamora app to create a more polished and engaging user experience.

## 🎯 Goals

- Add smooth, subtle entrance animations to enhance UX without being distracting
- Maintain 60 FPS performance on both iOS and Android
- Use staggered animations for lists and multiple elements
- Ensure animations don't negatively impact accessibility
- Create reusable animation components and hooks

## 🛠️ Technology Stack

- **React Native Animated API** - Built-in, lightweight, good performance
- **react-native-reanimated** (v4.1.1) - Already installed, for complex animations
- **expo-haptics** - Already installed, for tactile feedback

## 📊 Implementation Phases

### Phase 1: Setup & Infrastructure (7 tasks)

**Goal:** Create reusable animation infrastructure

1. **Create useEntranceAnimation hook** - Custom hook providing fade-in, slide-up, and scale animations with configurable delays/durations
2. **Create FadeInView component** - Wraps content with fade-in animation on mount
3. **Create SlideUpView component** - Wraps content with slide-up animation on mount
4. **Create ScaleInView component** - Wraps content with scale-in animation on mount
5. **Create StaggeredList component** - Animates list items with staggered delays
6. **Update AnimatedCard component** - Enhance existing component with entrance animations
7. **Document animation constants** - Add timing constants to theme.ts (durations, delays, easing)

**Animation Constants to Add:**
```typescript
export const animation = {
  duration: {
    instant: 0,
    fast: 150,      // Quick animations
    normal: 250,    // Standard animations
    slow: 350,      // Slower, more dramatic
    slower: 500,    // Very slow, special cases
  },
  delay: {
    none: 0,
    short: 50,      // Stagger delay for list items
    medium: 100,
    long: 150,
  },
  easing: {
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
```

### Phase 2: Auth Screens Animations (8 tasks)

**Screens:** WelcomeScreen, RoleSelectionScreen, LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen, TwoFactorVerificationScreen, OnboardingScreen

**Animation Strategy:**
- **Fade-in** for logos, headers, and main content
- **Slide-up** for buttons and form fields with stagger effect
- **Scale-in** for cards and role selection options

### Phase 3: Onboarding Screens Animations (3 tasks)

**Screens:** SplashScreen, PersonalizationScreen, ProviderOnboardingScreen

**Animation Strategy:**
- **Fade-in + scale** for logos and step indicators
- **Slide-up with stagger** for category chips and form sections
- **Scale-in with stagger** for service cards

### Phase 4: Customer Screens Animations (16 tasks)

**Screens:** HomeScreen, SearchScreen, BookingsScreen, BookingScreen, ProfileScreen, MessagesScreen, ChatScreen, LoyaltyScreen, ProviderPortfolioScreen, FavoritesScreen, SavedPostsScreen, EditProfileScreen, PaymentMethodsScreen, PaymentHistoryScreen, NotificationSettingsScreen, HelpSupportScreen

**Animation Strategy:**
- **Fade-in** for headers and main content areas
- **Slide-up with stagger** for cards, list items, and menu options
- **Scale-in with stagger** for grid items (providers, services, posts)

### Phase 5: Provider Screens Animations (20 tasks)

**Screens:** ProviderHomeScreen, AppointmentsScreen, ServicesScreen, AddEditServiceScreen, ServiceSelectionScreen, PortfolioScreen, CreateScreen, ProfileScreen, EditProfileScreen, AvailabilityScreen, EarningsScreen, AnalyticsScreen, ReviewsScreen, CustomersScreen, LocationScreen, BusinessSettingsScreen, TravelSettingsScreen, NotificationSettingsScreen, VerificationScreen, MessagesScreen

**Animation Strategy:**
- **Fade-in** for headers, tabs, and stat cards
- **Slide-up with stagger** for appointment cards, form fields, and list items
- **Scale-in with stagger** for service cards and feed posts

### Phase 6: Shared Components Animations (10 tasks)

**Components:** CategoryChip, PillTabs, FloatingTabBar, CurvedHeader, FeedPostCard, Modals (Booking, Review, Reschedule, AdvancedSearch), SkeletonCards, PersonalizedHome, SocialDiscoveryFeed, TrendingFeed

**Animation Strategy:**
- **Scale-in** for chips and small interactive elements
- **Slide-in/Slide-up** for tabs and navigation elements
- **Fade-in + scale** for modals
- **Staggered animations** for feed posts and grid layouts
- **Smooth fade-out** for skeleton loaders when content loads

### Phase 7: Testing & Performance Optimization (11 tasks)

**Testing Checklist:**
1. Test on iOS simulator (60 FPS verification)
2. Test on Android emulator (smooth performance)
3. Test on physical iOS device (real-world performance)
4. Test on physical Android device (real-world performance)
5. Performance profiling (React Native Performance Monitor)
6. Reduce complexity if needed (optimize for low-end devices)
7. Test with slow animations enabled (verify quality)
8. Verify useNativeDriver usage (all animations should use it)
9. Test animation interruptions (navigation during animations)
10. Accessibility testing (VoiceOver/TalkBack compatibility)
11. Document animation guidelines (best practices)

## 🎨 Animation Patterns

### Pattern 1: Fade-In
**Use for:** Headers, text content, images
**Duration:** 250-350ms
**Easing:** ease-out

### Pattern 2: Slide-Up
**Use for:** Cards, buttons, form fields
**Duration:** 250-350ms
**Distance:** 20-30px
**Easing:** ease-out

### Pattern 3: Scale-In
**Use for:** Small cards, chips, icons
**Duration:** 200-300ms
**Scale:** 0.8 → 1.0
**Easing:** spring or ease-out

### Pattern 4: Staggered List
**Use for:** Multiple items appearing together
**Base delay:** 50ms per item
**Max delay:** 300ms (cap for long lists)

## ⚡ Performance Guidelines

1. **Always use `useNativeDriver: true`** for transform and opacity animations
2. **Avoid animating layout properties** (width, height, padding, margin)
3. **Limit concurrent animations** to 10-15 items max
4. **Use `removeClippedSubviews`** for long lists
5. **Implement animation cancellation** on unmount
6. **Consider device performance** - reduce animations on low-end devices

## ♿ Accessibility Considerations

1. **Respect reduced motion preferences** - Check `AccessibilityInfo.isReduceMotionEnabled()`
2. **Don't rely on animation alone** for important information
3. **Ensure animations don't interfere** with screen readers
4. **Keep animations short** (< 500ms) to avoid delays
5. **Test with VoiceOver/TalkBack** enabled

## 📦 Total Task Count

- **Phase 1:** 7 tasks (Infrastructure)
- **Phase 2:** 8 tasks (Auth Screens)
- **Phase 3:** 3 tasks (Onboarding)
- **Phase 4:** 16 tasks (Customer Screens)
- **Phase 5:** 20 tasks (Provider Screens)
- **Phase 6:** 10 tasks (Shared Components)
- **Phase 7:** 11 tasks (Testing & Optimization)

**Total: 75 tasks**

## 🚀 Getting Started

1. Start with **Phase 1** to build the animation infrastructure
2. Test infrastructure with a single screen before proceeding
3. Move through phases sequentially
4. Test frequently on both iOS and Android
5. Optimize as you go, don't wait until the end

## 📚 Resources

- [React Native Animated API](https://reactnative.dev/docs/animated)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Animation Best Practices](https://reactnative.dev/docs/performance#use-nativedriver)
- [Accessibility Guidelines](https://reactnative.dev/docs/accessibility)

