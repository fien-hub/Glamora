import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  // apiVersion cast to `any` so SDK types don't require a specific hardcoded string
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
};

const toValidDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isActiveRevenueCatSubscription = (subscription: any) => {
  if (!subscription) return false;
  const expiresAt = toValidDate(subscription.expires_date);
  if (!expiresAt) {
    return true;
  }
  return expiresAt.getTime() > Date.now();
};

const legacyBillingResponse = (res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Legacy direct billing endpoints are deprecated. Booking checkout now uses RevenueCat.',
  });
};

export const verifyRevenueCatBookingPayment = async (req: Request, res: Response) => {
  try {
    const revenueCatApiKey = process.env.REVENUECAT_SECRET_API_KEY || process.env.REVENUECAT_SECRET_KEY;
    if (!revenueCatApiKey || revenueCatApiKey.includes('your_revenuecat')) {
      return res.status(500).json({ error: 'RevenueCat is not configured on backend' });
    }

    const authenticatedUserId = (req as any).user?.id;
    const { appUserId, productId, transactionId, platform } = req.body;

    if (authenticatedUserId !== appUserId) {
      return res.status(403).json({ error: 'Unauthorized app user for payment verification' });
    }

    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${revenueCatApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const payload: any = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: 'RevenueCat subscriber lookup failed',
        details: payload,
      });
    }

    const subscriber = payload?.subscriber;
    if (!subscriber) {
      return res.status(400).json({ error: 'RevenueCat subscriber not found' });
    }

    const allNonSubscriptions = Object.values(subscriber.non_subscriptions || {}).flat() as any[];
    const nonSubscriptionMatch = allNonSubscriptions.some((entry: any) => {
      const transactionMatches =
        entry?.id === transactionId ||
        entry?.store_transaction_id === transactionId ||
        entry?.transaction_id === transactionId;

      // Require BOTH transaction and product match for one-time purchases.
      return transactionMatches && entry?.product_id === productId;
    });

    // Booking checkout uses a one-time consumable purchase, so verification must
    // be tied to the exact transaction + product combination.
    const hasValidPurchase = Boolean(nonSubscriptionMatch);

    if (!hasValidPurchase) {
      return res.status(402).json({
        success: false,
        error: 'No valid RevenueCat purchase found for this user/product',
      });
    }

    // Idempotency guard: block reuse of a transaction already attached to a paid booking.
    // (Recurring series are handled by DB trigger rules, which allow same reference only
    // within one recurring_booking_id group.)
    const paymentReference = `rc_${transactionId}`;
    const { data: existingPaidBooking, error: existingPaidBookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_intent_id', paymentReference)
      .eq('payment_status', 'paid')
      .limit(1)
      .maybeSingle();

    if (existingPaidBookingError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to validate payment reference reuse',
      });
    }

    if (existingPaidBooking) {
      return res.status(409).json({
        success: false,
        error: 'This RevenueCat transaction has already been used for a booking.',
      });
    }

    return res.json({
      success: true,
      provider: 'revenuecat',
      platform,
      paymentReference,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[RevenueCat] Verification error:', error);
    return res.status(500).json({ error: error.message || 'RevenueCat verification failed' });
  }
};

export const createPaymentIntent = async (_req: Request, res: Response) => {
  return legacyBillingResponse(res);
};

export const confirmPayment = async (_req: Request, res: Response) => {
  return legacyBillingResponse(res);
};

export const createConnectedAccount = async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const userId = (req as any).user?.id;
    const { email, businessName, country = 'US' } = req.body;

    // Look up the provider profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('id, stripe_account_id')
      .eq('id', profile.id)
      .single();

    if (!providerProfile) {
      return res.status(404).json({ error: 'Provider profile not found' });
    }

    // Return existing account if already created
    if (providerProfile.stripe_account_id) {
      return res.json({ accountId: providerProfile.stripe_account_id, alreadyExists: true });
    }

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      business_type: 'individual',
      business_profile: {
        name: businessName,
        product_description: 'Beauty and wellness services marketplace',
        url: 'https://glamora.app',
        mcc: '7299', // Personal Services MCC
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { glamora_provider_id: providerProfile.id },
    });

    // Store stripe_account_id in provider_profiles
    await supabase
      .from('provider_profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', providerProfile.id);

    return res.json({ accountId: account.id });
  } catch (error: any) {
    console.error('[Stripe] createConnectedAccount error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe account' });
  }
};

export const createAccountLink = async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const userId = (req as any).user?.id;
    const { returnUrl, refreshUrl } = req.body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('id, stripe_account_id')
      .eq('id', profile.id)
      .single();

    if (!providerProfile) return res.status(404).json({ error: 'Provider profile not found' });

    let accountId = providerProfile.stripe_account_id;

    // Auto-create the account if it doesn't exist yet
    if (!accountId) {
      const { data: profileFull } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_id', userId)
        .single();

      const { data: ppFull } = await supabase
        .from('provider_profiles')
        .select('business_name')
        .eq('id', profile.id)
        .single();

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: (profileFull as any)?.email || '',
        business_type: 'individual',
        business_profile: {
          name: (ppFull as any)?.business_name || `${(profileFull as any)?.first_name || ''} ${(profileFull as any)?.last_name || ''}`.trim(),
          product_description: 'Beauty and wellness services marketplace',
          url: 'https://glamora.app',
          mcc: '7299',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { glamora_provider_id: profile.id },
      });

      accountId = account.id;
      await supabase
        .from('provider_profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', profile.id);
    }

    const finalReturnUrl = returnUrl || 'glamora://payout-return?status=success';
    const finalRefreshUrl = refreshUrl || 'glamora://payout-return?status=refresh';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: finalRefreshUrl,
      return_url: finalReturnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    return res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('[Stripe] createAccountLink error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create account link' });
  }
};

export const getAccountStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('id, stripe_account_id')
      .eq('id', profile.id)
      .single();

    if (!providerProfile?.stripe_account_id) {
      return res.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(providerProfile.stripe_account_id);

    const status = {
      connected: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirementsCurrentlyDue: account.requirements?.currently_due || [],
      requirementsEventuallyDue: account.requirements?.eventually_due || [],
    };

    // Sync latest status back to Supabase
    await supabase
      .from('provider_profiles')
      .update({
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      })
      .eq('id', providerProfile.id);

    return res.json(status);
  } catch (error: any) {
    console.error('[Stripe] getAccountStatus error:', error);
    // If the account was deleted on Stripe side, treat as not connected
    if (error.code === 'account_invalid') {
      return res.json({ connected: false, detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false });
    }
    return res.status(500).json({ error: error.message || 'Failed to get account status' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[Stripe] Webhook secret not configured — skipping signature check in dev mode');
    return res.json({ received: true });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as any;
    await supabase
      .from('provider_profiles')
      .update({
        stripe_onboarding_complete: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      })
      .eq('stripe_account_id', account.id);
  }

  return res.json({ received: true });
};

export const getCustomerPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          id,
          customer_id,
          provider_id,
          scheduled_date,
          scheduled_time,
          total_price,
          status,
          provider:provider_profiles!provider_id (
            business_name,
            profiles!inner (first_name, last_name)
          ),
          provider_service:provider_services!provider_service_id (
            duration_minutes,
            base_price,
            service:services (
              name,
              description,
              service_category:service_categories!category_id (
                name
              )
            )
          )
        )
      `)
      .eq('bookings.customer_id', profileData.id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching customer payments:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.json({ payments, total: payments?.length || 0 });
  } catch (error: any) {
    console.error('Get customer payments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProviderPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, limit = 50, offset = 0 } = req.query;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          id,
          customer_id,
          provider_id,
          scheduled_date,
          scheduled_time,
          total_price,
          status,
          customer:customer_profiles!customer_id (
            profiles!inner (first_name, last_name)
          ),
          provider_service:provider_services!provider_service_id (
            duration_minutes,
            base_price,
            service:services (
              name,
              description,
              service_category:service_categories!category_id (
                name
              )
            )
          )
        )
      `)
      .eq('bookings.provider_id', profileData.id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching provider payments:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.json({ payments, total: payments?.length || 0 });
  } catch (error: any) {
    console.error('Get provider payments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentId } = req.params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          id,
          customer_id,
          provider_id,
          scheduled_date,
          scheduled_time,
          total_price,
          status,
          address,
          city,
          state,
          zip_code,
          customer:customer_profiles!customer_id (
            profiles!inner (first_name, last_name, avatar_url)
          ),
          provider:provider_profiles!provider_id (
            business_name,
            profiles!inner (first_name, last_name, avatar_url)
          ),
          provider_service:provider_services!provider_service_id (
            duration_minutes,
            base_price,
            service:services (
              name,
              description,
              service_category:service_categories!category_id (
                name
              )
            )
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const booking = (payment as any).booking;
    if (booking.customer_id !== profileData.id && booking.provider_id !== profileData.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ payment });
  } catch (error: any) {
    console.error('Get payment details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestRefund = async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Automated legacy refunds are deprecated. Please contact support for manual refund handling.',
  });
};

export const getCustomerPaymentStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (customer_id)
      `)
      .eq('bookings.customer_id', profileData.id);

    const totalSpent = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    const totalRefunded = payments?.reduce((sum, payment) => sum + Number(payment.refund_amount || 0), 0) || 0;
    const successfulPayments = payments?.filter(payment => payment.status === 'succeeded').length || 0;
    const pendingPayments = payments?.filter(payment => payment.status === 'pending').length || 0;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPayments = payments?.filter(payment =>
      new Date(payment.created_at) >= firstDayOfMonth && payment.status === 'succeeded'
    ) || [];
    const thisMonthSpent = thisMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return res.json({
      totalSpent,
      totalRefunded,
      successfulPayments,
      pendingPayments,
      thisMonthSpent,
      totalPayments: payments?.length || 0,
    });
  } catch (error: any) {
    console.error('Get customer payment stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
