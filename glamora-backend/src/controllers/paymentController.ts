import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { notifyPaymentReceived } from '../utils/pushNotifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    console.log('[Payment] Create payment intent request received');
    console.log('[Payment] Request body:', req.body);
    console.log('[Payment] User:', (req as any).user?.id);

    const { bookingId } = req.body;

    if (!bookingId) {
      console.error('[Payment] Missing bookingId in request');
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    console.log('[Payment] Fetching booking:', bookingId);

    // Get booking details with provider info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        provider:provider_profiles(stripe_account_id, business_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('[Payment] Booking fetch error:', bookingError);
      return res.status(404).json({ error: 'Booking not found', details: bookingError.message });
    }

    if (!booking) {
      console.error('[Payment] Booking not found');
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('[Payment] Booking found:', {
      id: booking.id,
      amount: booking.total_price,
      customer: booking.customer_id,
      provider: booking.provider_id,
    });

    // Get customer profile with stripe_customer_id
    const { data: customerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, user_id')
      .eq('id', booking.customer_id)
      .single();

    if (profileError) {
      console.error('[Payment] Customer profile fetch error:', profileError);
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    // Get customer email from auth.users
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(customerProfile.user_id);

    if (userError || !user) {
      console.error('[Payment] User fetch error:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    const customerEmail = user.email;
    console.log('[Payment] Customer email:', customerEmail);

    const providerStripeAccount = (booking as any).provider?.stripe_account_id;
    const amount = Math.round(booking.total_price * 100); // Convert to cents

    console.log('[Payment] Provider Stripe account:', providerStripeAccount || 'NOT SET UP');
    console.log('[Payment] Amount:', amount / 100, 'USD');

    // Calculate application fee (10% platform fee)
    const applicationFeeAmount = Math.round(amount * 0.10);

    // Get or create Stripe customer
    let customerId = customerProfile?.stripe_customer_id;
    console.log('[Payment] Existing Stripe customer:', customerId || 'None');

    if (!customerId) {
      console.log('[Payment] Creating new Stripe customer...');
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          supabase_customer_id: booking.customer_id,
        },
      });
      customerId = customer.id;
      console.log('[Payment] Stripe customer created:', customerId);

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', booking.customer_id);
      console.log('[Payment] Customer ID saved to profile');
    }

    // Create payment intent options
    const paymentIntentOptions: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      customer: customerId,
      metadata: {
        bookingId: booking.id,
        customerId: booking.customer_id,
        providerId: booking.provider_id,
      },
    };

    // If provider has Stripe Connect account, use it for direct charges
    if (providerStripeAccount) {
      console.log('[Payment] Using Stripe Connect with provider account');
      paymentIntentOptions.application_fee_amount = applicationFeeAmount;
      paymentIntentOptions.transfer_data = {
        destination: providerStripeAccount,
      };
    } else {
      console.log('[Payment] Provider has no Stripe account - payment goes to platform');
    }

    console.log('[Payment] Creating Stripe payment intent...');
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
    console.log('[Payment] Payment intent created:', paymentIntent.id);

    // Create ephemeral key for customer
    console.log('[Payment] Creating ephemeral key...');
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );
    console.log('[Payment] Ephemeral key created');

    // Save payment record
    console.log('[Payment] Saving payment record to database...');
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: booking.total_price,
        currency: 'usd',
        status: 'pending',
        platform_fee: applicationFeeAmount / 100, // Store in dollars
      });

    if (paymentError) {
      console.error('[Payment] Failed to save payment record:', paymentError);
      return res.status(400).json({ error: paymentError.message });
    }

    console.log('[Payment] ✅ Payment intent created successfully!');
    console.log('[Payment] Sending response to client...');

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
    });
  } catch (error: any) {
    console.error('[Payment] ❌ Error creating payment intent:', error);
    console.error('[Payment] Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    console.log('[Confirm Payment] Request received');
    const { paymentIntentId, bookingId } = req.body;
    console.log('[Confirm Payment] Payment Intent ID:', paymentIntentId);
    console.log('[Confirm Payment] Booking ID:', bookingId);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('[Confirm Payment] Stripe status:', paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
      console.log('[Confirm Payment] Updating payment status to succeeded...');
      // Update payment status
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'succeeded',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (paymentUpdateError) {
        console.error('[Confirm Payment] Error updating payment:', paymentUpdateError);
      } else {
        console.log('[Confirm Payment] Payment status updated');
      }

      console.log('[Confirm Payment] Updating booking status to confirmed...');
      // Update booking status
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error('[Confirm Payment] Error updating booking:', bookingUpdateError);
      } else {
        console.log('[Confirm Payment] Booking status updated');
      }

      // Send notification to provider about payment
      try {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(`
            provider_id,
            total_price,
            provider_service:provider_services(
              service:services(name)
            )
          `)
          .eq('id', bookingId)
          .single();

        if (bookingData) {
          const serviceName = (bookingData as any).provider_service?.service?.name || 'service';
          await notifyPaymentReceived(
            bookingData.provider_id,
            bookingData.total_price,
            serviceName
          );
        }
      } catch (notifError) {
        console.error('Error sending payment notification:', notifError);
        // Don't fail the request if notification fails
      }

      res.json({
        message: 'Payment confirmed',
        status: 'succeeded'
      });
    } else if (paymentIntent.status === 'requires_payment_method') {
      // Payment failed, update status
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      res.status(400).json({
        message: 'Payment failed',
        status: paymentIntent.status,
        error: 'Payment method declined'
      });
    } else {
      res.json({
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Stripe Connect: Create connected account for provider
export const createConnectedAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { email, businessName, country = 'US' } = req.body;

    // Check if provider already has a connected account
    const { data: existingProvider } = await supabase
      .from('provider_profiles')
      .select('stripe_account_id, profiles!inner(user_id)')
      .eq('profiles.user_id', userId)
      .single();

    if (existingProvider?.stripe_account_id) {
      return res.json({
        accountId: existingProvider.stripe_account_id,
        message: 'Account already exists',
      });
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: businessName,
      },
    });

    // Save account ID to provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      await supabase
        .from('provider_profiles')
        .update({ stripe_account_id: account.id })
        .eq('id', profileData.id);
    }

    res.json({
      accountId: account.id,
      message: 'Connected account created',
    });
  } catch (error: any) {
    console.error('Create connected account error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Stripe Connect: Generate account link for onboarding
export const createAccountLink = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { returnUrl, refreshUrl } = req.body;

    // Get provider's Stripe account ID
    const { data: providerData } = await supabase
      .from('provider_profiles')
      .select('stripe_account_id, profiles!inner(user_id)')
      .eq('profiles.user_id', userId)
      .single();

    if (!providerData?.stripe_account_id) {
      return res.status(400).json({ error: 'No connected account found' });
    }

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: providerData.stripe_account_id,
      refresh_url: refreshUrl || `${process.env.APP_URL}/provider/onboarding`,
      return_url: returnUrl || `${process.env.APP_URL}/provider/dashboard`,
      type: 'account_onboarding',
    });

    res.json({
      url: accountLink.url,
    });
  } catch (error: any) {
    console.error('Create account link error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Stripe Connect: Get account status
export const getAccountStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get provider's Stripe account ID
    const { data: providerData } = await supabase
      .from('provider_profiles')
      .select('stripe_account_id, profiles!inner(user_id)')
      .eq('profiles.user_id', userId)
      .single();

    if (!providerData?.stripe_account_id) {
      return res.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(providerData.stripe_account_id);

    res.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountId: account.id,
    });
  } catch (error: any) {
    console.error('Get account status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update payment status
        await supabase
          .from('payments')
          .update({ status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Update booking status
        if (paymentIntent.metadata.bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', paymentIntent.metadata.bookingId);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', failedIntent.id);
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;

        // Update provider profile with account status
        await supabase
          .from('provider_profiles')
          .update({
            stripe_onboarding_complete: account.details_submitted,
          })
          .eq('stripe_account_id', account.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

// Get payment history for customer
export const getCustomerPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, limit = 50, offset = 0 } = req.query;

    // Get customer profile ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Build query
    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          id,
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

    res.json({ payments, total: payments?.length || 0 });
  } catch (error: any) {
    console.error('Get customer payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get payment history for provider
export const getProviderPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, limit = 50, offset = 0 } = req.query;

    // Get provider profile ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Build query
    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          id,
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

    res.json({ payments, total: payments?.length || 0 });
  } catch (error: any) {
    console.error('Get provider payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single payment details
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

    if (error) {
      console.error('Error fetching payment details:', error);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify user has access to this payment
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

    res.json({ payment });
  } catch (error: any) {
    console.error('Get payment details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Request refund (customer or provider can initiate)
export const requestRefund = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentId, reason, amount } = req.body;

    if (!paymentId || !reason) {
      return res.status(400).json({ error: 'Payment ID and reason are required' });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (
          customer_id,
          provider_id,
          status
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify user has access
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

    // Check if payment can be refunded
    if (payment.status !== 'succeeded') {
      return res.status(400).json({ error: 'Only successful payments can be refunded' });
    }

    if (payment.refund_amount > 0) {
      return res.status(400).json({ error: 'Payment has already been refunded' });
    }

    // Calculate refund amount (default to full amount if not specified)
    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
    }

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        refund_reason: reason,
        requested_by: userId,
      },
    });

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_amount: refundAmount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment after refund:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // Update booking status
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancellation_reason: reason })
      .eq('id', payment.booking_id);

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
      },
    });
  } catch (error: any) {
    console.error('Request refund error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get payment statistics for customer
export const getCustomerPaymentStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get customer profile ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get all payments
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!booking_id (customer_id)
      `)
      .eq('bookings.customer_id', profileData.id);

    const totalSpent = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalRefunded = payments?.reduce((sum, p) => sum + Number(p.refund_amount || 0), 0) || 0;
    const successfulPayments = payments?.filter(p => p.status === 'succeeded').length || 0;
    const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;

    // Calculate this month's spending
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthPayments = payments?.filter(p =>
      new Date(p.created_at) >= firstDayOfMonth && p.status === 'succeeded'
    ) || [];
    const thisMonthSpent = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      totalSpent,
      totalRefunded,
      successfulPayments,
      pendingPayments,
      thisMonthSpent,
      totalPayments: payments?.length || 0,
    });
  } catch (error: any) {
    console.error('Get customer payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

