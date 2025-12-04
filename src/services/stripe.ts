import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface StripeAccountStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  accountId?: string;
}

/**
 * Create a Stripe Connect account for a provider
 */
export const createConnectedAccount = async (
  email: string,
  businessName: string,
  country: string = 'US'
): Promise<{ accountId: string; message: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/connect/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email,
        businessName,
        country,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create connected account');
    }

    return data;
  } catch (error: any) {
    console.error('Create connected account error:', error);
    throw error;
  }
};

/**
 * Get Stripe account onboarding link
 */
export const getAccountOnboardingLink = async (
  returnUrl?: string,
  refreshUrl?: string
): Promise<{ url: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/connect/account-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        returnUrl,
        refreshUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get account link');
    }

    return data;
  } catch (error: any) {
    console.error('Get account link error:', error);
    throw error;
  }
};

/**
 * Get Stripe Connect account status
 */
export const getAccountStatus = async (): Promise<StripeAccountStatus> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/connect/account-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get account status');
    }

    return data;
  } catch (error: any) {
    console.error('Get account status error:', error);
    throw error;
  }
};

/**
 * Create payment intent for booking
 */
export const createPaymentIntent = async (
  bookingId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        bookingId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment intent');
    }

    return data;
  } catch (error: any) {
    console.error('Create payment intent error:', error);
    throw error;
  }
};

/**
 * Confirm payment
 */
export const confirmPaymentIntent = async (
  paymentIntentId: string,
  bookingId: string
): Promise<{ message: string; status: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        paymentIntentId,
        bookingId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to confirm payment');
    }

    return data;
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    throw error;
  }
};

