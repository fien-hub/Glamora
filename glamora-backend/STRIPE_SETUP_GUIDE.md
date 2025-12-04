# Stripe Connect Setup Guide for Glamora

## 📋 Overview

This guide will help you set up Stripe Connect for provider payments in Glamora.

## 🎯 What is Stripe Connect?

Stripe Connect allows your platform (Glamora) to:
- Accept payments on behalf of providers
- Automatically split payments (90% to provider, 10% platform fee)
- Handle payouts to providers
- Manage provider onboarding and verification

## 🔧 Prerequisites

1. **Stripe Account** - Sign up at [stripe.com](https://stripe.com)
2. **Business Information** - Legal business details for your platform
3. **Bank Account** - For receiving platform fees

## 🚀 Setup Steps

### Step 1: Create Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Complete your business profile
3. Verify your email and phone

### Step 2: Enable Stripe Connect

1. In Stripe Dashboard, go to **Connect** → **Settings**
2. Choose **Platform or Marketplace** as your business type
3. Configure these settings:
   - **Account Type**: Express (recommended for simplicity)
   - **Branding**: Upload Glamora logo and colors
   - **Redirect URLs**: Add your app's redirect URLs

### Step 3: Get API Keys

1. Go to **Developers** → **API Keys**
2. Copy these keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# Stripe Keys
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_your_client_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Platform Settings
STRIPE_PLATFORM_FEE_PERCENTAGE=10
```

### Step 5: Add Keys to Supabase

1. Go to Supabase Dashboard → **Project Settings** → **Secrets**
2. Add these secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### Step 6: Add Keys to React Native App

Update `glamora-app/.env`:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## 🔗 Integration Points

### 1. Provider Onboarding

When a provider signs up, create a Stripe Connect account:

```typescript
// Backend function (Supabase Edge Function)
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: provider.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Save to database
await supabase
  .from('provider_profiles')
  .update({ stripe_account_id: account.id })
  .eq('id', providerId);
```

### 2. Onboarding Link

Generate onboarding link for providers:

```typescript
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: 'glamora://stripe/refresh',
  return_url: 'glamora://stripe/return',
  type: 'account_onboarding',
});

// Open in browser
Linking.openURL(accountLink.url);
```

### 3. Payment Processing

When customer books a service:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount * 100, // Convert to cents
  currency: 'usd',
  application_fee_amount: Math.round(totalAmount * 0.10 * 100), // 10% fee
  transfer_data: {
    destination: providerStripeAccountId,
  },
  metadata: {
    booking_id: bookingId,
    customer_id: customerId,
    provider_id: providerId,
  },
});
```

## 📱 App Integration

### Install Stripe SDK

```bash
cd glamora-app
npx expo install @stripe/stripe-react-native
```

### Configure Stripe Provider

Update `glamora-app/App.tsx`:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
  {/* Your app */}
</StripeProvider>
```

## 🔔 Webhooks

### Step 1: Create Webhook Endpoint

Create Supabase Edge Function at `supabase/functions/stripe-webhook/index.ts`

### Step 2: Register Webhook in Stripe

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `account.updated`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payout.paid`
   - `payout.failed`

### Step 3: Copy Webhook Secret

Save the webhook signing secret to your environment variables.

## 🧪 Testing

### Test Mode

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test Payouts

In test mode, payouts are instant. In live mode, they follow your payout schedule.

## 🚀 Going Live

### Checklist

- [ ] Complete Stripe business verification
- [ ] Add bank account for platform fees
- [ ] Switch to live API keys
- [ ] Test end-to-end payment flow
- [ ] Set up payout schedule
- [ ] Configure email notifications
- [ ] Review pricing and fees
- [ ] Update terms of service

### Switch to Live Keys

1. Activate your Stripe account
2. Get live API keys (starts with `pk_live_` and `sk_live_`)
3. Update environment variables
4. Redeploy your app

## 💰 Fee Structure

**Recommended Setup:**
- **Platform Fee**: 10% of booking total
- **Stripe Fee**: ~2.9% + $0.30 per transaction
- **Provider Receives**: ~87% of booking total

Example for $100 booking:
- Customer pays: $100
- Stripe fee: $3.20
- Platform fee: $10.00
- Provider receives: $86.80

## 📞 Support

- **Stripe Docs**: [stripe.com/docs/connect](https://stripe.com/docs/connect)
- **Stripe Support**: support@stripe.com
- **Test Dashboard**: [dashboard.stripe.com/test](https://dashboard.stripe.com/test)

