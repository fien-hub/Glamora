# 🎯 E2E Testing - Completion Guide

## Current Status

✅ **Maestro CLI Installed** - The Maestro tool is already installed at `~/.maestro/bin`
✅ **E2E Test Infrastructure Created** - All 35+ test cases across 4 flows are ready
❌ **Java Required** - Maestro needs Java to run, but Homebrew installation failed due to network issues

---

## 🔧 Complete the Setup (3 Options)

### **Option 1: Install Java via Direct Download (Recommended)**

This is the most reliable method when Homebrew has network issues.

#### **Step 1: Download Java**

1. Visit: https://www.oracle.com/java/technologies/downloads/#jdk17-mac
2. Download **macOS Installer** (`.dmg` file) for your Mac:
   - **Intel Mac**: `jdk-17_macos-x64_bin.dmg`
   - **Apple Silicon (M1/M2/M3)**: `jdk-17_macos-aarch64_bin.dmg`

#### **Step 2: Install Java**

1. Open the downloaded `.dmg` file
2. Double-click the installer package
3. Follow the installation wizard
4. Enter your password when prompted

#### **Step 3: Verify Java Installation**

```bash
java -version
```

You should see output like:
```
java version "17.0.x"
Java(TM) SE Runtime Environment
```

#### **Step 4: Verify Maestro Works**

```bash
export PATH="$PATH":"$HOME/.maestro/bin"
maestro --version
```

You should see: `maestro 1.x.x`

#### **Step 5: Run E2E Tests**

```bash
cd glamora-app

# Run all tests
npm run test:e2e

# Or run specific flows
npm run test:e2e:auth      # Authentication tests
npm run test:e2e:booking   # Booking flow tests
npm run test:e2e:provider  # Provider flow tests
npm run test:e2e:search    # Search flow tests
```

---

### **Option 2: Try Homebrew Again Later**

Wait for network connectivity to improve, then try:

```bash
brew install openjdk@17
```

If successful, add Java to your PATH:

```bash
echo 'export PATH="/usr/local/opt/openjdk@17/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

Then verify and run tests as in Option 1 (Steps 3-5).

---

### **Option 3: Use Alternative Java Distribution (Adoptium)**

Download from Adoptium (formerly AdoptOpenJDK):

1. Visit: https://adoptium.net/temurin/releases/
2. Select:
   - **Version**: 17 (LTS)
   - **Operating System**: macOS
   - **Architecture**: Your Mac type (x64 or aarch64)
   - **Package Type**: PKG
3. Download and install
4. Verify and run tests as in Option 1 (Steps 3-5)

---

## 📋 Before Running Tests

### **1. Start the Expo App**

```bash
cd glamora-app
npm start
```

Press `i` for iOS simulator or `a` for Android emulator.

### **2. Start the Backend API**

```bash
cd glamora-backend
npm run dev
```

The API should be running on `http://localhost:3000`.

### **3. Create Test Users in Supabase**

Go to your Supabase dashboard and create these users:

**Customer Test User:**
- Email: `customer@test.com`
- Password: `TestPassword123!`
- Auto Confirm: ✅ Yes

**Provider Test User:**
- Email: `provider@test.com`
- Password: `TestPassword123!`
- Auto Confirm: ✅ Yes

Then add provider profile in the `profiles` table for the provider user.

---

## 🧪 Running the Tests

### **Run All Tests:**

```bash
cd glamora-app
npm run test:e2e
```

### **Run Specific Flow:**

```bash
# Authentication flow (8 tests)
npm run test:e2e:auth

# Booking flow (12 tests)
npm run test:e2e:booking

# Provider flow (9 tests)
npm run test:e2e:provider

# Search flow (8 tests)
npm run test:e2e:search
```

### **Run Single Test File:**

```bash
maestro test e2e/flows/01-auth-flow.yaml
```

---

## 📊 What the Tests Cover

### **1. Authentication Flow (8 tests)**
- ✅ Email/password sign up
- ✅ Email/password sign in
- ✅ Sign out
- ✅ Password reset
- ✅ Google OAuth
- ✅ Apple Sign-In
- ✅ Biometric authentication
- ✅ Session timeout

### **2. Booking Flow (12 tests)**
- ✅ Browse services
- ✅ Select provider
- ✅ Choose date/time
- ✅ Enter address
- ✅ Payment processing
- ✅ Booking confirmation
- ✅ View bookings
- ✅ Cancel booking
- ✅ Recurring bookings
- ✅ Calendar sync
- ✅ Booking notifications
- ✅ Booking history

### **3. Provider Flow (9 tests)**
- ✅ View bookings
- ✅ Accept booking
- ✅ Decline booking
- ✅ Complete booking
- ✅ Update availability
- ✅ Set time off
- ✅ View earnings
- ✅ Update profile
- ✅ Manage services

### **4. Search Flow (8 tests)**
- ✅ Search by service
- ✅ Search by location
- ✅ Filter by price
- ✅ Filter by rating
- ✅ Filter by availability
- ✅ Sort results
- ✅ View provider details
- ✅ Save favorites

---

## 🎯 Expected Results

When tests run successfully, you should see:

```
✓ 01-auth-flow.yaml (8/8 passed)
✓ 02-booking-flow.yaml (12/12 passed)
✓ 03-provider-flow.yaml (9/9 passed)
✓ 04-search-flow.yaml (8/8 passed)

Total: 37/37 tests passed ✅
```

---

## 🐛 Troubleshooting

### **"Java not found" error:**
- Make sure Java is installed: `java -version`
- Add Java to PATH: `export PATH="/usr/local/opt/openjdk@17/bin:$PATH"`

### **"Maestro not found" error:**
- Add Maestro to PATH: `export PATH="$PATH":"$HOME/.maestro/bin"`
- Or reinstall: `curl -Ls "https://get.maestro.mobile.dev" | bash`

### **"App not found" error:**
- Make sure Expo app is running: `npm start` in glamora-app
- Make sure simulator/emulator is open

### **"Test user not found" error:**
- Create test users in Supabase dashboard
- Make sure emails match exactly: `customer@test.com` and `provider@test.com`

### **"API not responding" error:**
- Make sure backend is running: `npm run dev` in glamora-backend
- Check API URL in `.env`: `EXPO_PUBLIC_API_URL=http://localhost:3000`

---

## 📚 Additional Resources

- **Maestro Documentation**: https://maestro.mobile.dev/
- **E2E Test Files**: `glamora-app/e2e/flows/`
- **Setup Instructions**: `glamora-app/e2e/SETUP_INSTRUCTIONS.md`
- **Test Summary**: `glamora-app/e2e/E2E_TEST_SUMMARY.md`

---

## ✅ Next Steps After E2E Tests Pass

Once you've successfully run the E2E tests:

1. ✅ Update `TESTING_PROGRESS.md` with E2E test results
2. ✅ Mark Phase 5 Task 3 as fully complete
3. ✅ Move to Phase 5 Task 7: App Store Assets
4. ✅ Continue with remaining Phase 5 tasks

---

**Status:** ⏳ Waiting for Java installation
**Blocker:** Network connectivity issues with Homebrew
**Solution:** Install Java manually using Option 1 above

