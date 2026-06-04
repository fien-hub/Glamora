import { Platform } from 'react-native';
// expo-apple-authentication calls native Sign-In-With-Apple at module level
// and can throw in New Architecture builds.
let AppleAuthentication: typeof import('expo-apple-authentication') = {} as any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuthentication = require('expo-apple-authentication');
} catch (e) { console.warn('[socialAuth.ts] expo-apple-authentication unavailable:', e); }
import { supabase } from '../services/supabase';

// Try to import GoogleSignin, but make it optional for Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  console.warn('Google Sign-In not available in Expo Go. Use a development build for Google Sign-In.');
}

const GOOGLE_IOS_CLIENT_ID_FALLBACK = '556025469880-2eall9hermo9c9p0c0b6p81h8gj1lbam.apps.googleusercontent.com';
const GOOGLE_IOS_REVERSED_SCHEME_FALLBACK = 'com.googleusercontent.apps.556025469880-2eall9hermo9c9p0c0b6p81h8gj1lbam';

/**
 * Configure Google Sign-In
 * Note: You need to add your Google OAuth client IDs in the configuration
 * This will be skipped in Expo Go
 */
export const configureGoogleSignIn = () => {
  if (!GoogleSignin) {
    console.warn('Google Sign-In not available. Skipping configuration.');
    return;
  }

  try {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_IOS_CLIENT_ID_FALLBACK;

    GoogleSignin.configure({
      // iOS client ID from Google Cloud Console
      iosClientId,
      // Android client ID from Google Cloud Console
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      // Web client ID from Google Cloud Console
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      offlineAccess: true,
    });

    console.log('[socialAuth] Google Sign-In configured', {
      hasIosClientId: !!iosClientId,
      expectedReversedScheme: GOOGLE_IOS_REVERSED_SCHEME_FALLBACK,
    });
  } catch (error) {
    console.warn('Failed to configure Google Sign-In:', error);
  }
};

/**
 * Check if Google Sign-In is available
 * Returns false in Expo Go, true in development builds
 */
export const isGoogleSignInAvailable = (): boolean => {
  return GoogleSignin !== null;
};

/**
 * Check if Apple Authentication is available
 */
export const isAppleAuthAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error('Error checking Apple Auth availability:', error);
    return false;
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}> => {
  // Check if Google Sign-In is available
  if (!GoogleSignin) {
    return {
      success: false,
      error: 'Google Sign-In is not available in Expo Go. Please use a development build.',
    };
  }

  try {
    // Check if device supports Google Play services
    await GoogleSignin.hasPlayServices();

    // Get user info from Google
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo.idToken) {
      return {
        success: false,
        error: 'No ID token received from Google',
      };
    }

    // Sign in to Supabase with Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.idToken,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);

    // Handle specific error codes
    if (error.code === 'SIGN_IN_CANCELLED') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    } else if (error.code === 'IN_PROGRESS') {
      return {
        success: false,
        error: 'Sign in is already in progress',
      };
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      return {
        success: false,
        error: 'Google Play Services not available',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

/**
 * Sign in with Apple
 */
export const signInWithApple = async (): Promise<{
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}> => {
  try {
    // Check if Apple Auth is available
    const isAvailable = await isAppleAuthAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Apple Authentication is not available on this device',
      };
    }

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return {
        success: false,
        error: 'No identity token received from Apple',
      };
    }

    // Sign in to Supabase with Apple ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // If this is the first sign-in, we might have name information
    let fullName = null;
    if (credential.fullName) {
      fullName = {
        firstName: credential.fullName.givenName || '',
        lastName: credential.fullName.familyName || '',
      };
    }

    return {
      success: true,
      user: { ...data.user, fullName },
      session: data.session,
    };
  } catch (error: any) {
    console.error('Apple Sign-In error:', error);

    // Handle specific error codes
    if (error.code === 'ERR_CANCELED') {
      return {
        success: false,
        error: 'Sign in was cancelled',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to sign in with Apple',
    };
  }
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
};

/**
 * Get current Google user (if signed in)
 */
export const getCurrentGoogleUser = async () => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      return await GoogleSignin.getCurrentUser();
    }
    return null;
  } catch (error) {
    console.error('Error getting current Google user:', error);
    return null;
  }
};

/**
 * Revoke Google access (complete sign out)
 */
export const revokeGoogleAccess = async (): Promise<void> => {
  try {
    await GoogleSignin.revokeAccess();
  } catch (error) {
    console.error('Error revoking Google access:', error);
  }
};

