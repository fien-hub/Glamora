import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

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
    const revenueCatApiKey = process.env.REVENUECAT_SECRET_API_KEY;
    if (!revenueCatApiKey) {
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

    const subscriptionMatch =
      subscriber.subscriptions?.[productId] &&
      isActiveRevenueCatSubscription(subscriber.subscriptions[productId]);

    const allNonSubscriptions = Object.values(subscriber.non_subscriptions || {}).flat() as any[];
    const nonSubscriptionMatch = allNonSubscriptions.some((entry: any) => {
      return (
        entry?.id === transactionId ||
        entry?.store_transaction_id === transactionId ||
        entry?.transaction_id === transactionId ||
        entry?.product_id === productId
      );
    });

    const entitlementId = process.env.REVENUECAT_REQUIRED_ENTITLEMENT;
    const entitlement = entitlementId ? subscriber.entitlements?.[entitlementId] : null;
    const entitlementMatch = entitlement
      ? entitlement?.expires_date
        ? new Date(entitlement.expires_date).getTime() > Date.now()
        : true
      : false;

    const hasValidPurchase = Boolean(subscriptionMatch || nonSubscriptionMatch || entitlementMatch);

    if (!hasValidPurchase) {
      return res.status(402).json({
        success: false,
        error: 'No valid RevenueCat purchase found for this user/product',
      });
    }

    return res.json({
      success: true,
      provider: 'revenuecat',
      platform,
      paymentReference: `rc_${transactionId}`,
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

export const createConnectedAccount = async (_req: Request, res: Response) => {
  return legacyBillingResponse(res);
};

export const createAccountLink = async (_req: Request, res: Response) => {
  return legacyBillingResponse(res);
};

export const getAccountStatus = async (_req: Request, res: Response) => {
  return res.json({
    connected: false,
    detailsSubmitted: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    message: 'Provider payout onboarding is temporarily unavailable while the payout system is being rebuilt.',
  });
};

export const handleWebhook = async (_req: Request, res: Response) => {
  return res.status(410).json({
    received: false,
    error: 'Legacy billing webhook endpoint is deprecated.',
  });
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
