# E2E Testing Setup Instructions

## 🚀 Quick Setup (5 minutes)

Follow these steps to get E2E testing up and running.

---

## Step 1: Install Maestro

### macOS / Linux

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Windows (WSL)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Verify Installation

```bash
maestro --version
```

You should see output like: `maestro 1.x.x`

---

## Step 2: Create Test Users

You need to create test users in your Supabase database.

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User**
4. Create these users:

**Customer Test User:**
- Email: `customer@test.com`
- Password: `TestPassword123!`
- Auto Confirm User: ✅ Yes

**Provider Test User:**
- Email: `provider@test.com`
- Password: `TestPassword123!`
- Auto Confirm User: ✅ Yes

5. After creating users, go to **Database** → **Table Editor** → **profiles**
6. Add profile records for each user:

**Customer Profile:**
```sql
INSERT INTO profiles (id, email, role, first_name, last_name, phone)
VALUES (
  '<customer_user_id>',
  'customer@test.com',
  'customer',
  'Test',
  'Customer',
  '+1234567890'
);
```

**Provider Profile:**
```sql
INSERT INTO profiles (id, email, role, first_name, last_name, phone, business_name)
VALUES (
  '<provider_user_id>',
  'provider@test.com',
  'provider',
  'Test',
  'Provider',
  '+1234567891',
  'Test Beauty Salon'
);
```

### Option B: Using SQL

Run this SQL in Supabase SQL Editor:

```sql
-- Create customer test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'customer@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create provider test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'provider@test.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

---

## Step 3: Start Required Services

### Terminal 1: Start Backend API

```bash
cd glamora-backend
npm start
```

Backend should be running on `http://localhost:3000`

### Terminal 2: Start Expo App

```bash
cd glamora-app
npm start
```

Press `i` for iOS simulator or `a` for Android emulator.

Wait for the app to load completely in the simulator/emulator.

---

## Step 4: Run Your First Test

### Option A: Using npm scripts

```bash
cd glamora-app

# Run authentication flow test
npm run test:e2e:auth
```

### Option B: Using Maestro directly

```bash
cd glamora-app
maestro test e2e/flows/01-auth-flow.yaml
```

### Option C: Using the test runner script

```bash
cd glamora-app
./e2e/run-tests.sh
```

This opens an interactive menu where you can select which tests to run.

---

## Step 5: Verify Test Results

If the test passes, you should see:

```
✅ Flow completed successfully
```

If the test fails, you'll see:

```
❌ Flow failed
```

With details about which step failed.

---

## 🎯 Running All Tests

Once your first test passes, run the full test suite:

```bash
npm run test:e2e
```

This will run all 4 test flows:
1. Authentication Flow (~2-3 min)
2. Booking Flow (~3-4 min)
3. Provider Flow (~2-3 min)
4. Search Flow (~2 min)

**Total time:** ~10-12 minutes

---

## 📊 Generate Test Report

To generate an HTML report with screenshots:

```bash
npm run test:e2e:report
```

The report will be saved to `.maestro/report.html`

On macOS, it will automatically open in your browser.

---

## 🐛 Troubleshooting

### Issue: "Maestro command not found"

**Solution:**
```bash
# Add Maestro to PATH
export PATH="$HOME/.maestro/bin:$PATH"

# Add to your shell profile
echo 'export PATH="$HOME/.maestro/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: "App not found"

**Solution:**
- Make sure Expo is running
- Make sure the app is loaded in simulator/emulator
- Try `launchApp: clearState: true` in test

### Issue: "Element not found"

**Solution:**
- Check if element text matches exactly
- Add `waitForAnimationToEnd` before assertions
- Increase timeout: `timeout: 10000`

### Issue: Test users can't log in

**Solution:**
- Verify users exist in Supabase Auth
- Verify profiles exist in profiles table
- Check email is confirmed
- Try logging in manually first

### Issue: Payment tests fail

**Solution:**
- Make sure backend is running
- Verify Stripe test keys are set
- Use test card: `4242424242424242`
- Check backend logs for errors

---

## 🎓 Next Steps

1. ✅ Run authentication flow test
2. ✅ Run booking flow test
3. ✅ Run provider flow test
4. ✅ Run search flow test
5. ⏳ Review test results
6. ⏳ Fix any failing tests
7. ⏳ Add more test scenarios
8. ⏳ Set up CI/CD integration

---

## 📚 Additional Resources

- [E2E Testing Guide](../E2E_TESTING_GUIDE.md) - Comprehensive guide
- [Test Summary](./E2E_TEST_SUMMARY.md) - Test coverage overview
- [Maestro README](./README.md) - Maestro documentation
- [Maestro Official Docs](https://maestro.mobile.dev/)

---

**Need Help?**

If you encounter issues:
1. Check the troubleshooting section above
2. Review test logs for error messages
3. Run tests in debug mode: `maestro test --debug e2e/flows/test.yaml`
4. Use Maestro Studio for interactive debugging: `npm run test:e2e:studio`

---

**Last Updated:** 2025-11-12

