import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TWO_FACTOR_ENABLED_KEY = 'two_factor_enabled';
const TWO_FACTOR_METHOD_KEY = 'two_factor_method';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export type TwoFactorMethod = 'sms' | 'email' | 'none';

/**
 * Check if 2FA is enabled for the current user
 */
export const isTwoFactorEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(TWO_FACTOR_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
};

/**
 * Get the 2FA method for the current user
 */
export const getTwoFactorMethod = async (): Promise<TwoFactorMethod> => {
  try {
    const method = await AsyncStorage.getItem(TWO_FACTOR_METHOD_KEY);
    return (method as TwoFactorMethod) || 'none';
  } catch (error) {
    console.error('Error getting 2FA method:', error);
    return 'none';
  }
};

/**
 * Enable 2FA for the current user
 */
export const enableTwoFactor = async (method: TwoFactorMethod): Promise<void> => {
  try {
    await AsyncStorage.setItem(TWO_FACTOR_ENABLED_KEY, 'true');
    await AsyncStorage.setItem(TWO_FACTOR_METHOD_KEY, method);
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
};

/**
 * Disable 2FA for the current user
 */
export const disableTwoFactor = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(TWO_FACTOR_ENABLED_KEY, 'false');
    await AsyncStorage.setItem(TWO_FACTOR_METHOD_KEY, 'none');
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw error;
  }
};

/**
 * Send 2FA verification code via email
 */
export const sendEmailVerificationCode = async (
  email: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Use Supabase's built-in OTP functionality
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Don't create new user, just send OTP
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
};

/**
 * Send 2FA verification code via SMS
 * Note: Requires Supabase phone authentication to be enabled
 */
export const sendSMSVerificationCode = async (
  phone: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Use Supabase's phone OTP functionality
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending SMS verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
};

/**
 * Verify OTP code
 */
export const verifyOTPCode = async (
  identifier: string, // email or phone
  code: string,
  type: 'email' | 'sms'
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    let result;
    
    if (type === 'email') {
      result = await supabase.auth.verifyOtp({
        email: identifier,
        token: code,
        type: 'email',
      });
    } else {
      result = await supabase.auth.verifyOtp({
        phone: identifier,
        token: code,
        type: 'sms',
      });
    }

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying OTP code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code',
    };
  }
};

/**
 * Check if biometric authentication is enabled
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return false;
  }
};

/**
 * Enable biometric authentication
 */
export const enableBiometric = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  } catch (error) {
    console.error('Error enabling biometric:', error);
    throw error;
  }
};

/**
 * Disable biometric authentication
 */
export const disableBiometric = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
  } catch (error) {
    console.error('Error disabling biometric:', error);
    throw error;
  }
};

/**
 * Generate a random 6-digit verification code
 * (For testing purposes - in production, use Supabase OTP)
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store verification code temporarily (for testing)
 */
const VERIFICATION_CODE_KEY = 'temp_verification_code';
const VERIFICATION_CODE_EXPIRY_KEY = 'temp_verification_code_expiry';

export const storeVerificationCode = async (code: string): Promise<void> => {
  try {
    const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes
    await AsyncStorage.setItem(VERIFICATION_CODE_KEY, code);
    await AsyncStorage.setItem(VERIFICATION_CODE_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error('Error storing verification code:', error);
  }
};

export const getStoredVerificationCode = async (): Promise<string | null> => {
  try {
    const code = await AsyncStorage.getItem(VERIFICATION_CODE_KEY);
    const expiry = await AsyncStorage.getItem(VERIFICATION_CODE_EXPIRY_KEY);
    
    if (!code || !expiry) return null;
    
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      // Code expired
      await AsyncStorage.removeItem(VERIFICATION_CODE_KEY);
      await AsyncStorage.removeItem(VERIFICATION_CODE_EXPIRY_KEY);
      return null;
    }
    
    return code;
  } catch (error) {
    console.error('Error getting stored verification code:', error);
    return null;
  }
};

export const clearVerificationCode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(VERIFICATION_CODE_KEY);
    await AsyncStorage.removeItem(VERIFICATION_CODE_EXPIRY_KEY);
  } catch (error) {
    console.error('Error clearing verification code:', error);
  }
};

