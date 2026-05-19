import { supabase } from './supabase';
import Constants from 'expo-constants';

const getApiUrl = (): string =>
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000';

const getAuthHeader = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface PayoutAccountStatus {
  connected: boolean;
  accountId?: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsCurrentlyDue?: string[];
  requirementsEventuallyDue?: string[];
}

/**
 * Gets the current Stripe Connect account status for the authenticated provider.
 */
export const getPayoutAccountStatus = async (): Promise<PayoutAccountStatus> => {
  const headers = await getAuthHeader();
  const response = await fetch(`${getApiUrl()}/api/payments/connect/account-status`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to get payout account status');
  }

  return response.json();
};

/**
 * Gets a Stripe-hosted onboarding URL for the provider to connect their bank account.
 * If no Stripe account exists yet, one is created automatically.
 */
export const getPayoutOnboardingUrl = async (): Promise<string> => {
  const headers = await getAuthHeader();
  const response = await fetch(`${getApiUrl()}/api/payments/connect/account-link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      returnUrl: 'glamora://payout-return?status=success',
      refreshUrl: 'glamora://payout-return?status=refresh',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to get payout onboarding link');
  }

  const data = await response.json();
  return data.url;
};