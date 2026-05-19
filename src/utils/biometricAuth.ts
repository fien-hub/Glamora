import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Get the type of biometric authentication available
 */
export const getBiometricType = async (): Promise<string> => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    
    return 'Biometric';
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return 'Biometric';
  }
};

/**
 * Authenticate using biometrics
 */
export const authenticateWithBiometrics = async (options?: {
  promptMessage?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Check if biometrics are available
    const available = await isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    // Get biometric type for custom message
    const biometricType = await getBiometricType();
    const defaultMessage = `Authenticate with ${biometricType}`;

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || defaultMessage,
      cancelLabel: options?.cancelLabel || 'Cancel',
      disableDeviceFallback: options?.disableDeviceFallback || false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Failed to authenticate',
    };
  }
};

/**
 * Check if device has a passcode/PIN set up
 */
export const hasDevicePasscode = async (): Promise<boolean> => {
  try {
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    return securityLevel > LocalAuthentication.SecurityLevel.NONE;
  } catch (error) {
    console.error('Error checking device passcode:', error);
    return false;
  }
};

/**
 * Get security level of the device
 */
export const getSecurityLevel = async (): Promise<{
  level: LocalAuthentication.SecurityLevel;
  description: string;
}> => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    
    let description = '';
    switch (level) {
      case LocalAuthentication.SecurityLevel.NONE:
        description = 'No security set up';
        break;
      case LocalAuthentication.SecurityLevel.SECRET:
        description = 'Passcode/PIN set up';
        break;
      case LocalAuthentication.SecurityLevel.BIOMETRIC:
        description = 'Biometric authentication set up';
        break;
      default:
        description = 'Unknown security level';
    }
    
    return { level, description };
  } catch (error) {
    console.error('Error getting security level:', error);
    return {
      level: LocalAuthentication.SecurityLevel.NONE,
      description: 'Unknown',
    };
  }
};

/**
 * Authenticate with biometrics or fallback to passcode
 */
export const authenticateWithBiometricsOrPasscode = async (
  promptMessage?: string
): Promise<{
  success: boolean;
  error?: string;
  method?: 'biometric' | 'passcode';
}> => {
  try {
    const biometricType = await getBiometricType();
    const message = promptMessage || `Authenticate with ${biometricType}`;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow fallback to passcode
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return {
        success: true,
        method: 'biometric', // Note: Can't distinguish if passcode was used
      };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error.message || 'Failed to authenticate',
    };
  }
};

