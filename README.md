# Glamora - Beauty Services Platform

A mobile and web platform connecting customers with verified beauty professionals for home service delivery.

## 🎯 Features

### For Customers
- Browse and book beauty services (nails, hair, makeup, etc.)
- View service provider portfolios and reviews
- Location-based service matching
- Secure in-app purchases via RevenueCat
- Real-time appointment tracking
- Rate and review service providers

### For Service Providers
- Professional profile with portfolio
- Availability calendar management
- Service listing and pricing
- Appointment notifications
- Earnings dashboard
- Customer reviews and ratings

### For Admins
- Provider verification system
- Platform analytics
- User management
- Service category management

## 🏗️ Tech Stack

### Frontend
- **React Native** with Expo (iOS, Android, Web)
- **TypeScript** for type safety
- **React Navigation** for routing
- **React Query** for data fetching
- **RevenueCat SDK** for in-app purchases

### Backend
- **Node.js** with Express
- **TypeScript**
- **Supabase** for authentication and database
- **PostgreSQL** database
- **RevenueCat** for payment processing

### Infrastructure
- **Supabase** - Auth, Database, Storage
- **RevenueCat** - In-app purchases & provider payouts
- **Expo** - Mobile app deployment

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn**
- **Expo CLI** - `npm install -g expo-cli`
- **Git**

For iOS development:
- **Xcode** (macOS only)

For Android development:
- **Android Studio**

## 🚀 Getting Started

### 1. Install Node.js
If you haven't installed Node.js yet:

**macOS (using Homebrew):**
```bash
brew install node
```

**Or download from:** https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Clone and Setup

```bash
# Navigate to project directory
cd /Users/twin1/Documents/Glamora

# Install dependencies for mobile app
cd glamora-app
npm install

# Install dependencies for backend
cd ../glamora-backend
npm install
```

### 3. Environment Configuration

#### Mobile App (.env)
Create `glamora-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_api_key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

#### Backend (.env)
Create `glamora-backend/.env`:
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
REVENUECAT_SECRET_KEY=your_revenuecat_secret_key
DATABASE_URL=your_supabase_database_url
```

### 4. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the database migrations in `glamora-backend/supabase/migrations`
3. Copy your project URL and keys to the .env files

### 5. RevenueCat Setup

1. Create a RevenueCat account at https://www.revenuecat.com
2. Get your API keys from the RevenueCat dashboard
3. Configure your entitlements and products
4. Copy keys to the .env files

### 6. Run the Application

#### Start Backend Server
```bash
cd glamora-backend
npm run dev
```

#### Start Mobile App
```bash
cd glamora-app
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app for physical device

## 📱 Project Structure

```
Glamora/
├── glamora-app/              # React Native mobile app
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── screens/          # App screens
│   │   ├── navigation/       # Navigation configuration
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   └── constants/        # App constants
│   ├── assets/               # Images, fonts, etc.
│   └── app.json              # Expo configuration
│
├── glamora-backend/          # Node.js backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── controllers/      # Route controllers
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   ├── supabase/
│   │   └── migrations/       # Database migrations
│   └── server.ts             # Entry point
│
└── README.md                 # This file
```

## 🗄️ Database Schema

### Main Tables
- **users** - User accounts (customers & providers)
- **profiles** - Extended user profile information
- **services** - Service catalog
- **provider_services** - Services offered by providers
- **bookings** - Appointment bookings
- **reviews** - Customer reviews
- **payments** - Payment records
- **availability** - Provider availability schedules

## 🔐 Authentication Flow

1. User signs up/logs in via Supabase Auth
2. User selects role (Customer or Service Provider)
3. Profile is created based on role
4. JWT token is used for API authentication

## 💳 Payment Flow

1. Customer selects service and books appointment
2. Payment processed via RevenueCat in-app purchase
3. Customer completes payment in-app
4. Booking confirmed upon successful payment
5. Provider receives payout after service completion

## 🧪 Testing

```bash
# Run backend tests
cd glamora-backend
npm test

# Run mobile app tests
cd glamora-app
npm test
```

## 📦 Deployment

### Mobile App
```bash
cd glamora-app
expo build:ios
expo build:android
```

### Backend
Deploy to your preferred platform (Heroku, Railway, Render, etc.)

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For support, email support@glamora.app

---

Built with ❤️ for beauty professionals and their clients

