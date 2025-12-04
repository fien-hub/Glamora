# Testing Setup for Glamora App

## Overview

Unit tests have been set up for the Glamora React Native application using Jest and React Testing Library.

## Test Configuration

### Files Created

1. **jest.config.js** - Jest configuration for React Native
2. **jest.setup.js** - Test environment setup with mocks
3. **__mocks__/fileMock.js** - Mock for image imports
4. **src/components/__tests__/** - Test files for components

### Test Files Created

- `BookingModal.test.tsx` - Tests for booking creation modal
- `ReviewModal.test.tsx` - Tests for review submission modal
- `RescheduleModal.test.tsx` - Tests for booking rescheduling modal
- `AdvancedSearchModal.test.tsx` - Tests for advanced search filters modal

## Current Test Results

**Status:** 37 tests passing out of 69 total tests

### Passing Tests

- ✅ **AdvancedSearchModal**: 24/24 tests passing
  - Rendering tests
  - Filter interaction tests (price, rating, distance, availability, sort)
  - Apply and reset functionality
  - Modal close behavior

### Failing Tests

The following test suites have failures that need to be addressed:

1. **BookingModal** - Import errors with expo-device and analytics
2. **ReviewModal** - Import errors with expo-device and analytics
3. **RescheduleModal** - Unable to find time slot elements in tests

## Common Issues and Solutions

### 1. Module Import Errors

**Issue:** `Cannot use import statement outside a module` for Expo modules

**Solution:** Add modules to `transformIgnorePatterns` in jest.config.js:

```javascript
transformIgnorePatterns: [
  'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|...)/)',
],
```

### 2. Missing Mocks

**Issue:** Tests fail because external dependencies aren't mocked

**Solution:** Add mocks in jest.setup.js for:
- Expo modules (expo-device, expo-constants, expo-notifications, etc.)
- React Native modules (AsyncStorage, Clipboard, etc.)
- Third-party libraries (Supabase, Stripe, Mixpanel, etc.)

### 3. Component Text Mismatches

**Issue:** Tests look for text that doesn't exist in the component

**Solution:** 
1. View the actual component to see the exact text labels
2. Update test expectations to match the actual component text
3. Use regex patterns for dynamic text (e.g., `/km/` instead of exact match)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- --testPathPattern="AdvancedSearchModal"
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Coverage Goals

Target coverage thresholds (configured in jest.config.js):
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

## Next Steps to Complete Testing

### 1. Fix Remaining Component Tests

**BookingModal and ReviewModal:**
- Mock expo-device and expo-constants properly
- Ensure analytics module is mocked correctly
- Fix import chain issues

**RescheduleModal:**
- Update test expectations to match actual component structure
- Mock react-native-calendars properly
- Fix time slot selection tests

### 2. Add More Component Tests

Create tests for additional components:
- `SharePortfolioModal.test.tsx`
- `ShareProviderModal.test.tsx`
- `PersonalizedHome.test.tsx`

### 3. Add Utility Function Tests

Create tests for utility modules:
- `utils/__tests__/analytics.test.ts`
- `utils/__tests__/socialSharing.test.ts`
- `utils/__tests__/recurringBooking.test.ts`
- `utils/__tests__/sessionManager.test.ts`
- `utils/__tests__/biometricAuth.test.ts`
- `utils/__tests__/twoFactorAuth.test.ts`

### 4. Add Context Tests

Create tests for React contexts:
- `contexts/__tests__/AuthContext.test.tsx`
- `contexts/__tests__/AnalyticsContext.test.tsx`
- `contexts/__tests__/NotificationsContext.test.tsx`

### 5. Add Service Tests

Create tests for service modules:
- `services/__tests__/supabase.test.ts`
- `services/__tests__/availability.test.ts`
- `services/__tests__/location.test.ts`
- `services/__tests__/stripe.test.ts`

## Testing Best Practices

### 1. Test Structure

Follow the AAA pattern:
- **Arrange:** Set up test data and mocks
- **Act:** Execute the code being tested
- **Assert:** Verify the expected outcome

### 2. Test Naming

Use descriptive test names:
```typescript
it('should display error when rating is not selected', () => {
  // Test implementation
});
```

### 3. Mock External Dependencies

Always mock:
- API calls (Supabase, Stripe, etc.)
- Native modules (Camera, Location, etc.)
- Navigation
- Analytics

### 4. Test User Interactions

Test from the user's perspective:
```typescript
const submitButton = getByText('Submit');
fireEvent.press(submitButton);
await waitFor(() => {
  expect(mockOnSuccess).toHaveBeenCalled();
});
```

### 5. Use Testing Library Queries

Prefer queries in this order:
1. `getByText` - For visible text
2. `getByPlaceholderText` - For input fields
3. `getByTestId` - As a last resort

## Debugging Tests

### View Component Output

Use `debug()` to see the rendered component:
```typescript
const { debug } = render(<MyComponent />);
debug();
```

### Check What's Rendered

Use `screen.logTestingPlaygroundURL()` to get an interactive view:
```typescript
import { screen } from '@testing-library/react-native';
screen.logTestingPlaygroundURL();
```

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

## Continuous Integration

### GitHub Actions

Add a test workflow to `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing React Native Apps](https://reactnative.dev/docs/testing-overview)

## Summary

The testing infrastructure is now in place with:
- ✅ Jest configuration
- ✅ Test environment setup
- ✅ Comprehensive mocks for external dependencies
- ✅ 4 component test suites created
- ✅ 37 tests passing
- ⚠️ 32 tests need fixes (mostly import/mock issues)

**Next Priority:** Fix the failing tests in BookingModal, ReviewModal, and RescheduleModal by ensuring all dependencies are properly mocked.

