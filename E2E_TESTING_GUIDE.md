# End-to-End Testing Guide

## 📋 Overview

This guide covers the complete E2E testing setup for the Glamora app using Maestro. E2E tests simulate real user interactions to ensure the app works correctly from start to finish.

## 🎯 Test Coverage

### ✅ Implemented Tests

1. **Authentication Flow** (`01-auth-flow.yaml`)
   - Customer signup with personalization
   - Provider signup
   - Login/logout
   - Invalid credentials handling

2. **Booking Flow** (`02-booking-flow.yaml`)
   - Service search
   - Provider selection
   - Date/time selection
   - Address entry
   - Payment processing
   - Booking confirmation
   - Booking cancellation

3. **Provider Flow** (`03-provider-flow.yaml`)
   - Provider onboarding
   - Dashboard navigation
   - Service management
   - Appointment viewing

4. **Search & Filter Flow** (`04-search-flow.yaml`)
   - Basic search
   - Advanced filters (price, rating, distance, availability)
   - Sort options
   - Location-based search

## 🚀 Quick Start

### 1. Install Maestro

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

### 2. Start the App

```bash
cd glamora-app
npm start
```

Press `i` for iOS or `a` for Android in the Expo terminal.

### 3. Run Tests

```bash
# Run all tests
maestro test e2e/flows/

# Run specific test
maestro test e2e/flows/01-auth-flow.yaml

# Run with HTML report
maestro test --format html e2e/flows/
```

## 📁 Project Structure

```
glamora-app/
├── e2e/
│   ├── README.md                    # Maestro documentation
│   ├── flows/                       # Test flows
│   │   ├── 01-auth-flow.yaml       # Authentication tests
│   │   ├── 02-booking-flow.yaml    # Booking tests
│   │   ├── 03-provider-flow.yaml   # Provider tests
│   │   └── 04-search-flow.yaml     # Search tests
│   ├── helpers/                     # Reusable helpers
│   │   ├── login-customer.yaml     # Customer login helper
│   │   ├── login-provider.yaml     # Provider login helper
│   │   └── logout.yaml             # Logout helper
│   └── config/
│       └── maestro-config.yaml     # Global configuration
└── E2E_TESTING_GUIDE.md            # This file
```

## 🧪 Test Scenarios

### Authentication Flow

**Test Cases:**
- ✅ User can complete onboarding
- ✅ User can sign up as customer
- ✅ User can sign up as provider
- ✅ User can complete personalization
- ✅ User can log in
- ✅ User can log out
- ✅ Invalid credentials show error

**Duration:** ~2-3 minutes

### Booking Flow

**Test Cases:**
- ✅ Customer can search for services
- ✅ Customer can view provider profile
- ✅ Customer can select date and time
- ✅ Customer can enter service address
- ✅ Customer can complete payment
- ✅ Customer receives booking confirmation
- ✅ Customer can view booking details
- ✅ Customer can cancel booking

**Duration:** ~3-4 minutes

### Provider Flow

**Test Cases:**
- ✅ Provider can complete onboarding
- ✅ Provider can view dashboard
- ✅ Provider can add services
- ✅ Provider can view appointments
- ✅ Provider can manage profile

**Duration:** ~2-3 minutes

### Search & Filter Flow

**Test Cases:**
- ✅ Customer can search by keyword
- ✅ Customer can filter by price range
- ✅ Customer can filter by rating
- ✅ Customer can filter by distance
- ✅ Customer can filter by availability
- ✅ Customer can sort results
- ✅ Customer can clear filters

**Duration:** ~2 minutes

## 🔧 Configuration

### Test Users

Create these test users in your Supabase database:

```sql
-- Customer test user
INSERT INTO auth.users (email, encrypted_password)
VALUES ('customer@test.com', crypt('TestPassword123!', gen_salt('bf')));

-- Provider test user
INSERT INTO auth.users (email, encrypted_password)
VALUES ('provider@test.com', crypt('TestPassword123!', gen_salt('bf')));
```

### Environment Variables

Make sure these are set in your `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_test_key
```

## 📊 Running Tests in CI/CD

### GitHub Actions

Add this to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd glamora-app
          npm install
      
      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH
      
      - name: Start Expo
        run: |
          cd glamora-app
          npm start &
          sleep 30
      
      - name: Run E2E Tests
        run: |
          cd glamora-app
          maestro test e2e/flows/
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: maestro-results
          path: .maestro/
```

### Maestro Cloud (Recommended)

For better CI/CD integration, use Maestro Cloud:

```bash
# Sign up at https://cloud.mobile.dev/
# Get your API key

# Run tests on Maestro Cloud
maestro cloud --apiKey=$MAESTRO_API_KEY e2e/flows/
```

## 🐛 Debugging Tests

### Common Issues

#### 1. Element Not Found

**Problem:** Test fails with "Element not found"

**Solutions:**
- Add `waitForAnimationToEnd` before assertions
- Increase timeout: `timeout: 10000`
- Use `optional: true` for optional elements
- Check element text matches exactly

```yaml
# Bad
- tapOn: "Sign In"

# Good
- tapOn: "Sign In"
- waitForAnimationToEnd:
    timeout: 5000
```

#### 2. Flaky Tests

**Problem:** Tests pass sometimes, fail other times

**Solutions:**
- Add explicit waits
- Use `assertVisible` before `tapOn`
- Avoid hardcoded delays
- Check for loading states

```yaml
# Bad
- tapOn: "Submit"
- assertVisible: "Success"

# Good
- tapOn: "Submit"
- waitForAnimationToEnd
- assertVisible: "Loading"
  optional: true
- waitForAnimationToEnd:
    timeout: 10000
- assertVisible: "Success"
```

#### 3. App Not Launching

**Problem:** Maestro can't find the app

**Solutions:**
- Make sure Expo is running
- Check `appId` is correct (`host.exp.Exponent` for Expo Go)
- Try `launchApp: clearState: true`

#### 4. Payment Tests Failing

**Problem:** Payment tests fail or timeout

**Solutions:**
- Use Stripe test card: `4242424242424242`
- Increase timeout for payment processing
- Check backend is running
- Verify Stripe test keys are set

### Debug Mode

Run tests with debug output:

```bash
maestro test --debug e2e/flows/01-auth-flow.yaml
```

### Interactive Mode

Use Maestro Studio to debug interactively:

```bash
maestro studio
```

This opens an interactive session where you can:
1. See the app screen
2. Click elements
3. See generated YAML commands
4. Test selectors

## 📈 Test Reports

### HTML Reports

Generate HTML reports with screenshots:

```bash
maestro test --format html e2e/flows/
```

Reports are saved in `.maestro/` directory.

### View Reports

```bash
open .maestro/report.html
```

### CI/CD Reports

Upload reports as artifacts in CI/CD:

```yaml
- name: Upload Test Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: e2e-test-reports
    path: .maestro/
```

## 🎯 Best Practices

### 1. Keep Tests Independent

Each test should be able to run independently:

```yaml
# Good - starts fresh
- launchApp:
    clearState: true

# Bad - depends on previous test state
- launchApp
```

### 2. Use Descriptive Names

```yaml
# Bad
- tapOn: "Button"

# Good
- tapOn: "Continue to Payment"
```

### 3. Add Comments

```yaml
# ========================================
# Test 1: User Login
# ========================================
- tapOn: "Sign In"
# ... test steps
```

### 4. Use Helpers for Common Actions

```yaml
# Instead of repeating login steps
- runFlow: ../helpers/login-customer.yaml
```

### 5. Assert Before Actions

```yaml
# Good - verify element exists before tapping
- assertVisible: "Sign In"
- tapOn: "Sign In"

# Bad - might tap wrong element
- tapOn: "Sign In"
```

### 6. Handle Loading States

```yaml
- tapOn: "Submit"
- waitForAnimationToEnd
- assertVisible: "Loading"
  optional: true
- waitForAnimationToEnd:
    timeout: 10000
- assertVisible: "Success"
```

### 7. Clean Up Test Data

```yaml
# Cancel test bookings
- tapOn: "Cancel Booking"
- tapOn: "Yes, Cancel"
```

## 📝 Writing New Tests

### 1. Plan the Test Flow

Write down the steps a user would take:
1. Open app
2. Navigate to screen
3. Fill form
4. Submit
5. Verify result

### 2. Create YAML File

```yaml
appId: host.exp.Exponent
---
# Test description
- launchApp:
    clearState: true
- waitForAnimationToEnd

# Test steps...
```

### 3. Run and Debug

```bash
maestro test e2e/flows/your-test.yaml
```

### 4. Add Assertions

Verify the app is in the expected state:

```yaml
- assertVisible: "Expected Text"
- assertNotVisible: "Should Not See This"
```

### 5. Handle Edge Cases

```yaml
# Optional elements
- tapOn: "Skip"
  optional: true

# Conditional flows
- tapOn: "Accept"
  optional: true
- waitForAnimationToEnd
```

## 🔍 Test Maintenance

### Regular Updates

- Update tests when UI changes
- Add tests for new features
- Remove tests for deprecated features
- Keep test data fresh

### Review Test Results

- Check test reports regularly
- Fix flaky tests immediately
- Update timeouts if needed
- Improve test coverage

### Performance

- Keep tests fast (< 5 minutes each)
- Run critical tests more frequently
- Use parallel execution when possible
- Cache dependencies in CI/CD

## 📚 Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro GitHub](https://github.com/mobile-dev-inc/maestro)
- [Maestro Cloud](https://cloud.mobile.dev/)
- [Expo Testing Guide](https://docs.expo.dev/guides/testing/)

## 🎓 Next Steps

1. ✅ Set up Maestro CLI
2. ✅ Create test users in database
3. ✅ Run authentication flow test
4. ✅ Run booking flow test
5. ✅ Run provider flow test
6. ✅ Run search flow test
7. ⏳ Set up CI/CD integration
8. ⏳ Add more test scenarios
9. ⏳ Monitor test results

---

**Last Updated:** 2025-11-12


