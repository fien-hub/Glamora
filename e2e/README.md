# End-to-End Testing with Maestro

This directory contains E2E tests for the Glamora app using [Maestro](https://maestro.mobile.dev/).

## 🎯 What is Maestro?

Maestro is a simple and effective mobile UI testing framework that works seamlessly with React Native and Expo apps. It uses YAML files to define test flows, making tests easy to read and maintain.

## 📦 Installation

### Install Maestro CLI

**macOS/Linux:**
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Windows (WSL):**
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Verify Installation
```bash
maestro --version
```

## 🚀 Running Tests

### 1. Start the Expo App
```bash
cd glamora-app
npm start
```

### 2. Run All E2E Tests
```bash
maestro test e2e/flows/
```

### 3. Run Specific Test
```bash
maestro test e2e/flows/01-auth-flow.yaml
maestro test e2e/flows/02-booking-flow.yaml
maestro test e2e/flows/03-provider-flow.yaml
```

### 4. Run Tests in Cloud (CI/CD)
```bash
maestro cloud --apiKey=<YOUR_API_KEY> e2e/flows/
```

## 📁 Test Structure

```
e2e/
├── README.md                    # This file
├── flows/                       # Test flow definitions
│   ├── 01-auth-flow.yaml       # Authentication tests
│   ├── 02-booking-flow.yaml    # Booking flow tests
│   ├── 03-provider-flow.yaml   # Provider flow tests
│   └── 04-search-flow.yaml     # Search and filter tests
├── helpers/                     # Reusable test helpers
│   └── common-actions.yaml     # Common actions (login, logout, etc.)
└── config/                      # Test configuration
    └── maestro-config.yaml     # Maestro configuration
```

## 🧪 Test Flows

### 1. Authentication Flow (`01-auth-flow.yaml`)
- ✅ User can sign up as customer
- ✅ User can sign up as provider
- ✅ User can log in with email/password
- ✅ User can log out
- ✅ Invalid credentials show error

### 2. Booking Flow (`02-booking-flow.yaml`)
- ✅ Customer can search for services
- ✅ Customer can view provider details
- ✅ Customer can select date and time
- ✅ Customer can enter address
- ✅ Customer can complete payment
- ✅ Booking confirmation is shown

### 3. Provider Flow (`03-provider-flow.yaml`)
- ✅ Provider can view dashboard
- ✅ Provider can view appointments
- ✅ Provider can manage services
- ✅ Provider can update availability

### 4. Search Flow (`04-search-flow.yaml`)
- ✅ Customer can search by service name
- ✅ Customer can filter by location
- ✅ Customer can filter by price
- ✅ Customer can filter by rating

## 🎬 Recording Tests

Maestro Studio allows you to record tests interactively:

```bash
maestro studio
```

This opens an interactive session where you can:
1. Interact with your app
2. See the generated YAML commands
3. Copy and paste into your test files

## 📊 Test Reports

Maestro generates detailed reports including:
- Screenshots at each step
- Execution time
- Success/failure status
- Error messages

Reports are saved in `.maestro/` directory.

## 🔧 Debugging Tests

### Run with verbose output:
```bash
maestro test --debug e2e/flows/01-auth-flow.yaml
```

### Run with screenshots:
```bash
maestro test --format html e2e/flows/
```

### Pause test execution:
```yaml
- runFlow: pause  # Pauses test for manual inspection
```

## 🌐 CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Run E2E Tests
  run: |
    maestro test e2e/flows/
```

### Maestro Cloud (Recommended):
```yaml
- name: Run E2E Tests on Maestro Cloud
  run: |
    maestro cloud --apiKey=${{ secrets.MAESTRO_API_KEY }} e2e/flows/
```

## 📝 Writing Tests

### Basic Test Structure:
```yaml
appId: host.exp.Exponent  # Expo Go app ID
---
- launchApp
- tapOn: "Sign In"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Welcome"
```

### Best Practices:
1. ✅ Use descriptive test names
2. ✅ Add comments for complex flows
3. ✅ Use assertions to verify state
4. ✅ Keep tests independent
5. ✅ Clean up test data after tests

## 🐛 Common Issues

### Issue: App not found
**Solution:** Make sure Expo app is running and accessible

### Issue: Element not found
**Solution:** Add `waitForAnimationToEnd` or increase timeout

### Issue: Tests flaky
**Solution:** Add explicit waits and assertions

## 📚 Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro GitHub](https://github.com/mobile-dev-inc/maestro)
- [Maestro Cloud](https://cloud.mobile.dev/)

