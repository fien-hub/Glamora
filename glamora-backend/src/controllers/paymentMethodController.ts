import { Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Get all payment methods for a customer
export const getPaymentMethods = async (req: Request, res: Response) => {
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

    // Get payment methods from database
    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('customer_id', profileData.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ paymentMethods: paymentMethods || [] });
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new payment method
export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentMethodId, setAsDefault } = req.body;

    // Get customer profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        customer_profiles!inner (
          id,
          stripe_customer_id
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const customerProfile = (profileData as any).customer_profiles;
    let stripeCustomerId = customerProfile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profileData.email,
        metadata: {
          user_id: userId,
          profile_id: profileData.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update customer profile with Stripe customer ID
      await supabase
        .from('customer_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerProfile.id);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      return res.status(400).json({ error: 'Only card payment methods are supported' });
    }

    // Save payment method to database
    const { data: savedMethod, error: saveError } = await supabase
      .from('payment_methods')
      .insert({
        customer_id: customerProfile.id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: paymentMethod.card.brand,
        last_four: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
        cardholder_name: paymentMethod.billing_details.name || null,
        is_default: setAsDefault || false,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving payment method:', saveError);
      return res.status(400).json({ error: saveError.message });
    }

    res.json({ paymentMethod: savedMethod, message: 'Payment method added successfully' });
  } catch (error: any) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Delete a payment method
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentMethodId } = req.params;

    // Get customer profile ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get payment method from database
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('customer_id', profileData.id)
      .single();

    if (fetchError || !paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Detach payment method from Stripe
    try {
      await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);
    } catch (stripeError: any) {
      console.error('Error detaching payment method from Stripe:', stripeError);
      // Continue with database deletion even if Stripe detach fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    if (deleteError) {
      console.error('Error deleting payment method:', deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error: any) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentMethodId } = req.params;

    // Get customer profile ID
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify payment method belongs to user
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('customer_id', profileData.id)
      .single();

    if (fetchError || !paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update payment method to be default (trigger will handle unsetting others)
    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId);

    if (updateError) {
      console.error('Error setting default payment method:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: 'Default payment method updated successfully' });
  } catch (error: any) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create setup intent for adding payment method
export const createSetupIntent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get customer profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        customer_profiles!inner (
          id,
          stripe_customer_id
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const customerProfile = (profileData as any).customer_profiles;
    let stripeCustomerId = customerProfile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profileData.email,
        metadata: {
          user_id: userId,
          profile_id: profileData.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update customer profile with Stripe customer ID
      await supabase
        .from('customer_profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerProfile.id);
    }

    // Create setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
      setupIntentId: setupIntent.id,
    });
  } catch (error: any) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Confirm setup intent and save payment method
export const confirmSetupIntent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { setupIntentId } = req.body;

    // Get customer profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select(`
        id,
        customer_profiles!inner (
          id
        )
      `)
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const customerProfile = (profileData as any).customer_profiles;

    // Retrieve setup intent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Setup intent not completed' });
    }

    if (!setupIntent.payment_method) {
      return res.status(400).json({ error: 'No payment method attached to setup intent' });
    }

    const paymentMethodId = typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method.id;

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      return res.status(400).json({ error: 'Only card payment methods are supported' });
    }

    // Check if payment method already exists
    const { data: existingMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .single();

    if (existingMethod) {
      return res.json({
        paymentMethod: existingMethod,
        message: 'Payment method already exists'
      });
    }

    // Check if this is the first payment method for the customer
    const { data: existingMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('customer_id', customerProfile.id);

    const isFirstMethod = !existingMethods || existingMethods.length === 0;

    // Save payment method to database
    const { data: savedMethod, error: saveError } = await supabase
      .from('payment_methods')
      .insert({
        customer_id: customerProfile.id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: paymentMethod.card.brand,
        last_four: paymentMethod.card.last4,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
        cardholder_name: paymentMethod.billing_details.name || null,
        is_default: isFirstMethod, // Set as default if it's the first method
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving payment method:', saveError);
      return res.status(400).json({ error: saveError.message });
    }

    res.json({ paymentMethod: savedMethod, message: 'Payment method added successfully' });
  } catch (error: any) {
    console.error('Confirm setup intent error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

