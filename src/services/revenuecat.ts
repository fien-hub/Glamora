import { Platform } from 'react-native';

let purchasesClient: any = null;
let configuredAppUserId: string | null = null;

const isMissingConfigValue = (value?: string | null) => {
  if (!value) return true;
  const normalized = value.trim();
  return (
    normalized.length === 0 ||
    normalized.includes('your_revenuecat') ||
    normalized === 'booking_single_service'
  );
};

const getApiKeyForPlatform = () => {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
  }

  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';
  }

  return '';
};

const getBackendBaseUrl = () => {
  return process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
};

const ensureConfigured = async (appUserId: string) => {
  if (!purchasesClient) {
    const module = await import('react-native-purchases');
    purchasesClient = module.default || module;
  }

  if (configuredAppUserId === appUserId) {
    return;
  }

  const apiKey = getApiKeyForPlatform();
  if (isMissingConfigValue(apiKey)) {
    throw new Error(
      Platform.OS === 'ios'
        ? 'Missing valid EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'
        : 'Missing valid EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'
    );
  }

  await purchasesClient.configure({
    apiKey,
    appUserID: appUserId,
  });

  configuredAppUserId = appUserId;
};

const isUserCanceledPurchase = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('cancel') || error?.userCancelled === true || error?.code === '1';
};

export interface RevenueCatBookingPurchase {
  appUserId: string;
  productId: string;
  transactionId: string;
  platform: 'ios' | 'android';
}

export interface RevenueCatBookingVerification {
  success: boolean;
  provider?: string;
  platform?: 'ios' | 'android';
  paymentReference?: string;
  verifiedAt?: string;
  error?: string;
}

export const purchaseBookingProduct = async (appUserId: string): Promise<RevenueCatBookingPurchase> => {
  await ensureConfigured(appUserId);

  const bookingProductId = process.env.EXPO_PUBLIC_REVENUECAT_BOOKING_PRODUCT_ID;
  if (isMissingConfigValue(bookingProductId)) {
    throw new Error('Missing valid EXPO_PUBLIC_REVENUECAT_BOOKING_PRODUCT_ID');
  }

  try {
    const products = await purchasesClient.getProducts([bookingProductId]);
    const product = products?.[0];

    if (!product) {
      throw new Error(`RevenueCat product not found: ${bookingProductId}`);
    }

    const result = await purchasesClient.purchaseStoreProduct(product);

    const transactionId =
      result?.transaction?.transactionIdentifier ||
      result?.transaction?.identifier ||
      result?.transaction?.revenueCatId ||
      `${Date.now()}`;

    return {
      appUserId,
      productId: bookingProductId,
      transactionId,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch (error: any) {
    if (isUserCanceledPurchase(error)) {
      throw new Error('Payment was canceled');
    }

    throw new Error(error?.message || 'RevenueCat purchase failed');
  }
};

export const verifyRevenueCatBookingPayment = async (
  accessToken: string,
  payload: RevenueCatBookingPurchase
): Promise<RevenueCatBookingVerification> => {
  if (!accessToken) {
    throw new Error('Missing auth token for RevenueCat payment verification');
  }

  const response = await fetch(`${getBackendBaseUrl()}/api/payments/revenuecat/verify-booking-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as RevenueCatBookingVerification;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'RevenueCat payment verification failed');
  }

  return data;
};

export const getRevenueCatBookingConfigStatus = () => {
  const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
  const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';
  const bookingProductId = process.env.EXPO_PUBLIC_REVENUECAT_BOOKING_PRODUCT_ID || '';

  return {
    iosConfigured: !isMissingConfigValue(iosApiKey),
    androidConfigured: !isMissingConfigValue(androidApiKey),
    bookingProductConfigured: !isMissingConfigValue(bookingProductId),
    currentPlatformConfigured:
      Platform.OS === 'ios'
        ? !isMissingConfigValue(iosApiKey)
        : Platform.OS === 'android'
          ? !isMissingConfigValue(androidApiKey)
          : false,
    bookingProductId,
  };
};
