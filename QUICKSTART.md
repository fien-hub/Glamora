# Glamora - Quick Start Guide

Get up and running with Glamora in 10 minutes!

## Prerequisites

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- A **Supabase** account ([Sign up](https://supabase.com))
- A **RevenueCat** account ([Sign up](https://www.revenuecat.com))

## 1. Install Node.js (if not installed)

**macOS:**
```bash
brew install node
```

**Or download from:** https://nodejs.org/

**Verify:**
```bash
node --version  # Should be v18 or higher
```

## 2. Install Dependencies

Run the installation script:
```bash
chmod +x install.sh
./install.sh
```

Or manually:
```bash
# Install mobile app dependencies
cd glamora-app
npm install

# Install backend dependencies
cd ../glamora-backend
npm install
```

## 3. Set Up Supabase

### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it "glamora"
4. Choose a region
5. Set a database password (save it!)

### Run Migrations
1. In Supabase dashboard → **SQL Editor**
2. Run these files in order:
   - `glamora-backend/supabase/schema.sql`
   - `glamora-backend/supabase/rls-policies.sql`
   - `glamora-backend/supabase/seed-data.sql`

### Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - `anon` public key
   - `service_role` key

## 4. Set Up RevenueCat

1. Go to [revenuecat.com](https://www.revenuecat.com)
2. Sign up/login
3. Go to **Project Settings** → **API Keys**
4. Copy your public and secret API keys

## 5. Configure Environment

### Mobile App
Create `glamora-app/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_public_key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Backend
Create `glamora-backend/.env`:
```env
PORT=3000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...
REVENUECAT_SECRET_KEY=your_revenuecat_secret_key
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

## 6. Run the App

### Terminal 1 - Backend
```bash
cd glamora-backend
npm run dev
```

### Terminal 2 - Mobile App
```bash
cd glamora-app
npm start
```

Then press:
- `w` for web browser
- `i` for iOS simulator
- `a` for Android emulator

## 7. Test It Out!

1. Click "Get Started"
2. Create a customer account
3. Explore the app!

## Troubleshooting

### "Node.js not found"
Install Node.js from https://nodejs.org/

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
```

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection errors
- Double-check your `.env` files
- Verify migrations ran successfully
- Check Supabase project is active

## What's Next?

- Read the full [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Check out [README.md](README.md) for architecture details
- Start building features!

## Need Help?

- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions
- Review Supabase docs: https://supabase.com/docs
- Review Expo docs: https://docs.expo.dev/

---

**You're all set!** 🎉 Start building amazing beauty service experiences!

