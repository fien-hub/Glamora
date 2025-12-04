# Glamora Setup Guide

This guide will walk you through setting up the complete Glamora beauty services platform from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Or install via Homebrew (macOS): `brew install node`
   - Verify: `node --version` and `npm --version`

2. **Git**
   - Download from: https://git-scm.com/
   - Or install via Homebrew: `brew install git`

3. **Expo CLI** (for mobile development)
   ```bash
   npm install -g expo-cli
   ```

### Optional (for native development)
- **Xcode** (macOS only, for iOS development)
- **Android Studio** (for Android development)

## Step 1: Install Node.js

If you haven't installed Node.js yet:

**macOS:**
```bash
brew install node
```

**Or download installer:**
Visit https://nodejs.org/ and download the LTS version

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

## Step 2: Install Project Dependencies

### Mobile App
```bash
cd glamora-app
npm install
```

### Backend
```bash
cd glamora-backend
npm install
```

## Step 3: Set Up Supabase

### Create Supabase Project
1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Name**: glamora
   - **Database Password**: (create a strong password - save this!)
   - **Region**: Choose closest to your location
5. Wait for project to be created (~2 minutes)

### Get Supabase Credentials
1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### Run Database Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `glamora-backend/supabase/schema.sql`
4. Click **Run**
5. Repeat for `glamora-backend/supabase/rls-policies.sql`
6. Repeat for `glamora-backend/supabase/seed-data.sql`

Alternatively, you can run all three files in order.

## Step 4: Set Up Stripe

### Create Stripe Account
1. Go to https://stripe.com
2. Sign up for an account
3. Complete account setup

### Get Stripe Keys
1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy the following:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### Set Up Webhook (for production)
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your backend URL: `https://your-backend-url.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

## Step 5: Configure Environment Variables

### Mobile App Environment
Create `glamora-app/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_ENV=development
```

### Backend Environment
Create `glamora-backend/.env`:
```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Step 6: Run the Application

### Start Backend Server
```bash
cd glamora-backend
npm run dev
```

The backend should start on http://localhost:3000

### Start Mobile App
In a new terminal:
```bash
cd glamora-app
npm start
```

This will start the Expo development server. You'll see a QR code and options:

- Press `w` to open in web browser
- Press `i` to open iOS simulator (requires Xcode)
- Press `a` to open Android emulator (requires Android Studio)
- Scan QR code with Expo Go app on your phone

## Step 7: Test the Application

### Create Test Accounts

1. **Customer Account**
   - Open the app
   - Click "Get Started"
   - Select "Customer" role
   - Fill in registration form
   - Sign up

2. **Provider Account**
   - Sign out
   - Click "Get Started"
   - Select "Provider" role
   - Fill in registration form
   - Sign up

### Test Features
- Sign in/out
- Browse categories (customer)
- View dashboard (provider)
- Navigate between screens

## Troubleshooting

### Node.js Not Found
```bash
# Install Node.js via Homebrew
brew install node

# Or download from https://nodejs.org/
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env file
```

### Expo Issues
```bash
# Clear Expo cache
expo start -c

# Or reinstall Expo CLI
npm uninstall -g expo-cli
npm install -g expo-cli
```

### Supabase Connection Issues
- Verify your Supabase URL and keys in `.env`
- Check that RLS policies are enabled
- Ensure database migrations ran successfully

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

### For Development
1. Implement additional features (see README.md)
2. Add more screens and functionality
3. Integrate real-time features
4. Add push notifications
5. Implement image uploads

### For Production
1. Set up production Supabase project
2. Configure production Stripe account
3. Deploy backend to hosting service (Railway, Render, Heroku)
4. Build mobile apps:
   ```bash
   cd glamora-app
   expo build:ios
   expo build:android
   ```
5. Submit to App Store and Google Play

## Useful Commands

### Mobile App
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in web browser
npm test           # Run tests
```

### Backend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm test           # Run tests
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main README.md
3. Check Supabase documentation: https://supabase.com/docs
4. Check Expo documentation: https://docs.expo.dev/
5. Check Stripe documentation: https://stripe.com/docs

## Project Structure

```
Glamora/
├── glamora-app/              # React Native mobile app
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── screens/          # App screens
│   │   │   ├── auth/         # Authentication screens
│   │   │   ├── customer/     # Customer screens
│   │   │   └── provider/     # Provider screens
│   │   ├── navigation/       # Navigation setup
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   ├── constants/        # Constants and theme
│   │   └── types/            # TypeScript types
│   └── App.tsx               # App entry point
│
├── glamora-backend/          # Node.js backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Express middleware
│   │   └── server.ts         # Server entry point
│   └── supabase/
│       ├── schema.sql        # Database schema
│       ├── rls-policies.sql  # Row Level Security
│       └── seed-data.sql     # Initial data
│
└── README.md                 # Main documentation
```

---

**Congratulations!** 🎉 You've successfully set up the Glamora platform!

