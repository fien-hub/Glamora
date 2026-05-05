import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, authService, dbService } from '../services/supabase';
import type { UserRole } from '../types';

import { trackSignUp, trackSignIn, trackSignOut, trackLoginAttempt, trackSessionTimeout } from '../utils/analytics';
import sessionManager from '../utils/sessionManager';
import { setSentryUser, clearSentryUser, setSentryTag } from '../services/sentry';
import { locationTrackingService } from '../services/locationTracking';
import { recordStartupCheckpoint } from '../utils/startupDiagnostics';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  needsOnboarding: boolean;
  needsVerification: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    phone?: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signInWithGoogle: (role: UserRole) => Promise<void>;
  signInWithApple: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: 'customer' | 'provider') => Promise<void>;
  markOnboardingComplete: () => void;
  refreshOnboardingStatus: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getWelcomeMessageKey = (userId: string) => `glamora_show_welcome_${userId}`;

const loadSocialAuth = () => require('../utils/socialAuth') as typeof import('../utils/socialAuth');

const queueWelcomeMessage = async (userId: string) => {
  try {
    await AsyncStorage.setItem(getWelcomeMessageKey(userId), 'true');
  } catch (error) {
    console.warn('[AuthContext] Failed to queue welcome message:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const isSigningUpRef = useRef(false);
  const authHydrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isSigningUpRef.current = isSigningUp;
  }, [isSigningUp]);

  useEffect(() => {
    recordStartupCheckpoint('AuthProvider.effect.start', 'ok');

    // Configure Google Sign-In lazily so native modules are not touched during bootstrap.
    setTimeout(() => {
      try {
        loadSocialAuth().configureGoogleSignIn();
      } catch (error) {
        console.warn('[AuthContext] Google Sign-In configuration skipped:', error);
      }
    }, 0);

    // Hard safety timeout: if loading is still true after 10 s, force it off so
    // the app never stays stuck on the splash/spinner indefinitely.
    const loadingTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          recordStartupCheckpoint('AuthProvider.loadingTimeout', 'warn', { timeoutMs: 10000 });
          console.warn('[AuthContext] loading timeout hit — forcing loading=false');
          return false;
        }
        return prev;
      });
    }, 10000);

    // Get initial session — with a 5 s hard timeout so a slow/offline
    // network never keeps the app permanently on the splash screen.
    const getSessionTimeout = setTimeout(() => {
      recordStartupCheckpoint('AuthProvider.getSession', 'warn', { reason: 'timeout after 5000ms' });
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(getSessionTimeout);

      if (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const invalidRefreshToken = reason.toLowerCase().includes('invalid refresh token');

        recordStartupCheckpoint('AuthProvider.getSession', 'warn', {
          reason,
          invalidRefreshToken,
        });

        if (invalidRefreshToken) {
          console.warn('[AuthContext] Invalid refresh token detected, resetting to signed-out state');
          void supabase.auth.signOut().catch(() => undefined);
        }

        setSession(null);
        setUser(null);
        setUserRole(null);
        setNeedsOnboarding(false);
        setNeedsVerification(false);
        setLoading(false);
        return;
      }

      recordStartupCheckpoint('AuthProvider.getSession', 'ok', {
        hasSession: !!session,
      });

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        // Initialize session manager when user is authenticated
        sessionManager.initialize();
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      clearTimeout(getSessionTimeout);
      recordStartupCheckpoint('AuthProvider.getSession', 'error', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      recordStartupCheckpoint('AuthProvider.onAuthStateChange', 'ok', {
        event: _event,
        hasSession: !!session,
      });

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (authHydrationTimeoutRef.current) {
          clearTimeout(authHydrationTimeoutRef.current);
        }

        setLoading(true);
        authHydrationTimeoutRef.current = setTimeout(() => {
          setLoading((prev) => {
            if (prev) {
              recordStartupCheckpoint('AuthProvider.onAuthStateChange.timeout', 'warn', {
                timeoutMs: 8000,
              });
              console.warn('[AuthContext] auth hydration timeout hit — forcing loading=false');
              return false;
            }
            return prev;
          });
        }, 8000);

        // Don't fetch role if we're in the middle of signup - signUp function handles it
        if (!isSigningUpRef.current) {
          fetchUserRole(session.user.id);
        }
        // Initialize session manager on sign in
        await sessionManager.reset();
        await sessionManager.initialize();

        // Set Sentry user context
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        if (authHydrationTimeoutRef.current) {
          clearTimeout(authHydrationTimeoutRef.current);
          authHydrationTimeoutRef.current = null;
        }

        setUserRole(null);
        setNeedsOnboarding(false);
        setNeedsVerification(false);
        setLoading(false);
        // Stop session monitoring on sign out
        sessionManager.stopMonitoring();
        
        // Stop location tracking
        await locationTrackingService.stop();

        // Clear Sentry user context
        clearSentryUser();
      }
    });

    // Monitor app state changes to update activity
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearTimeout(loadingTimeout);
      if (authHydrationTimeoutRef.current) {
        clearTimeout(authHydrationTimeoutRef.current);
      }
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && user) {
      // Update activity when app becomes active
      await sessionManager.updateActivity();
    }
  };

  // Fire-and-forget reactivation after startup completes — never blocks auth.
  const reactivateUserAsync = (userId: string) => {
    void (async () => {
      try {
        const { error } = await supabase
          .from('users')
          .update({
            is_active: true,
            deactivated_at: null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', userId);

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (!msg.includes('column') || !msg.includes('does not exist')) {
            console.warn('[AuthContext] reactivateUser failed (non-blocking):', error.message);
          }
        }
      } catch (e: unknown) {
        console.warn('[AuthContext] reactivateUser exception (non-blocking):', e);
      }
    })();
  };

  const fetchUserRole = async (userId: string, retryCount = 0) => {
    // Kick off reactivation immediately in the background — never awaited.
    if (retryCount === 0) reactivateUserAsync(userId);

    try {
      recordStartupCheckpoint('AuthProvider.fetchUserRole.start', 'start', {
        retryCount,
      });

      console.log('[AuthContext] Fetching role for user:', userId, 'attempt:', retryCount + 1);

      // Query the users table - role is ONLY stored here, not in profiles
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        recordStartupCheckpoint('AuthProvider.fetchUserRole.usersError', 'warn', {
          retryCount,
          message: error.message,
        });

        console.log('[AuthContext] Users table error:', error.message);

        // No role found - retry up to 3 times with delay (for new signups that might be processing)
        if (retryCount < 3) {
          console.log('[AuthContext] No user record found, retrying in 1 second...');
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
          return fetchUserRole(userId, retryCount + 1);
        }

        // After all retries, user might be in onboarding - this is expected for new signups
        console.log('[AuthContext] No user record found after retries - user may be completing onboarding');
        recordStartupCheckpoint('AuthProvider.fetchUserRole.noRecordAfterRetries', 'warn');
        setLoading(false);
        return;
      }

      if (data?.role) {
        recordStartupCheckpoint('AuthProvider.fetchUserRole.roleResolved', 'ok', {
          role: data.role,
        });

        console.log('[AuthContext] User role fetched from users table:', data.role);
        setUserRole(data.role as UserRole);
        setSentryTag('user_role', data.role);

        // Start location tracking (best-effort — do not block loading on this)
        locationTrackingService.initialize(userId, data.role as 'customer' | 'provider').catch((err) => {
          console.warn('[AuthContext] Location tracking init failed:', err);
        });

        await checkOnboardingStatus(userId, data.role as UserRole);
        setLoading(false);
        return;
      }

      // No role found - retry up to 3 times with delay (for new signups that might be processing)
      if (retryCount < 3) {
        recordStartupCheckpoint('AuthProvider.fetchUserRole.retry', 'warn', {
          nextRetry: retryCount + 1,
        });
        console.log('[AuthContext] No role found, retrying in 1 second...');
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
        return fetchUserRole(userId, retryCount + 1);
      }

      // After all retries, user might be in onboarding - this is expected for new signups
      console.log('[AuthContext] No role found after retries - user may be completing onboarding');
      recordStartupCheckpoint('AuthProvider.fetchUserRole.noRoleAfterRetries', 'warn');
      setLoading(false);
    } catch (error) {
      recordStartupCheckpoint('AuthProvider.fetchUserRole.exception', 'error', {
        reason: error instanceof Error ? error.message : 'unknown error',
      });
      console.error('[AuthContext] Exception fetching user role:', error);
      setLoading(false);
    }
  };

  const checkVerificationStatus = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('user_id', userId)
        .single();

      const isVerified = !!profileData?.email_verified;
      console.log('[AuthContext] Verification status:', {
        email_verified: profileData?.email_verified,
        isVerified,
      });

      setNeedsVerification(!isVerified);
      return isVerified;
    } catch (error) {
      console.error('[AuthContext] Error checking verification status:', error);
      // Fail-safe: require verification if status cannot be determined
      setNeedsVerification(true);
      return false;
    }
  };

  const checkOnboardingStatus = async (userId: string, role: UserRole) => {
    try {
      const isVerified = await checkVerificationStatus(userId);
      console.log('[AuthContext] checkOnboardingStatus - isVerified:', isVerified);

      // Verification is required before onboarding
      if (!isVerified) {
        setNeedsOnboarding(false);
        return;
      }

      // Get profile id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('[AuthContext] Error fetching profile:', profileError);
      }

      if (!profileData) {
        console.log('[AuthContext] No profile found, needs onboarding');
        setNeedsOnboarding(true);
        return;
      }

      console.log('[AuthContext] Profile ID:', profileData.id);

      // Check role-specific onboarding status
      if (role === 'customer') {
        const { data: customerProfile, error: customerError } = await supabase
          .from('customer_profiles')
          .select('onboarding_completed')
          .eq('id', profileData.id)
          .single();

        if (customerError) {
          console.error('[AuthContext] Error fetching customer profile:', customerError);
        }

        console.log('[AuthContext] Customer onboarding_completed:', customerProfile?.onboarding_completed);
        const needsOnboarding = !customerProfile?.onboarding_completed;
        console.log('[AuthContext] Setting needsOnboarding to:', needsOnboarding);
        setNeedsOnboarding(needsOnboarding);
      } else if (role === 'provider') {
        const { data: providerProfile, error: providerError } = await supabase
          .from('provider_profiles')
          .select('onboarding_completed')
          .eq('id', profileData.id)
          .single();

        if (providerError) {
          console.error('[AuthContext] Error fetching provider profile:', providerError);
        }

        console.log('[AuthContext] Provider onboarding_completed:', providerProfile?.onboarding_completed);
        const needsOnboarding = !providerProfile?.onboarding_completed;
        console.log('[AuthContext] Setting needsOnboarding to:', needsOnboarding);
        setNeedsOnboarding(needsOnboarding);
      }
    } catch (error) {
      console.error('[AuthContext] Error checking onboarding status:', error);
      // Default to needing onboarding if there's an error
      setNeedsOnboarding(true);
    }
  };

  const refreshOnboardingStatus = async () => {
    console.log('[AuthContext] refreshOnboardingStatus called, user:', user?.id, 'role:', userRole);
    if (user && userRole) {
      await checkOnboardingStatus(user.id, userRole);
      console.log('[AuthContext] refreshOnboardingStatus completed');
    } else {
      console.log('[AuthContext] refreshOnboardingStatus skipped - no user or role');
    }
  };

  const markOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  const refreshVerificationStatus = async () => {
    if (user && userRole) {
      const isVerified = await checkVerificationStatus(user.id);
      // If verified, also check onboarding status
      if (isVerified) {
        await checkOnboardingStatus(user.id, userRole);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await authService.signIn(email, password);
      if (error) {
        // Track failed login attempt
        trackLoginAttempt(false, 'email');
        throw error;
      }

      // Track successful login
      trackSignIn('email');
      trackLoginAttempt(true, 'email');
    } catch (error) {
      // Track failed login attempt
      trackLoginAttempt(false, 'email');
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    phone?: string
  ) => {
    try {
      setLoading(true);
      // Set flag to prevent auth state change listener from interfering
      setIsSigningUp(true);

      // Sign up with metadata
      const { data, error } = await authService.signUp(email, password, {
        role,
        first_name: firstName,
        last_name: lastName,
        phone,
      });

      if (error) {
        console.error('[AuthContext] Signup error:', error);
        setIsSigningUp(false);
        throw error;
      }

      if (!data.user) {
        setIsSigningUp(false);
        throw new Error('No user returned from signup');
      }

      console.log('[AuthContext] User signed up successfully:', data.user.id);

      // Use secure function to create all profile records
      console.log('[AuthContext] Calling create_user_profile with:', {
        user_id: data.user.id,
        email: data.user.email || email,
        role,
        first_name: firstName || 'User',
        last_name: lastName || 'User',
      });

      const { data: profileResult, error: profileError } = await supabase
        .rpc('create_user_profile', {
          p_user_id: data.user.id,
          p_email: data.user.email || email,
          p_role: role,
          p_first_name: firstName || 'User',
          p_last_name: lastName || 'User',
          p_phone: phone || null,
        });

      if (profileError) {
        console.error('[AuthContext] Error calling create_user_profile:', profileError);
        console.error('[AuthContext] Error details:', JSON.stringify(profileError, null, 2));
        // Delete the auth user since profile creation failed
        await supabase.auth.signOut();
        setIsSigningUp(false);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      if (!profileResult) {
        console.error('[AuthContext] No result from create_user_profile');
        await supabase.auth.signOut();
        setIsSigningUp(false);
        throw new Error('Failed to create user profile: No result returned');
      }

      if (!profileResult.success) {
        console.error('[AuthContext] Profile creation failed:', profileResult);
        await supabase.auth.signOut();
        setIsSigningUp(false);
        throw new Error(profileResult.message || 'Failed to create user profile');
      }

      console.log('[AuthContext] Profile creation complete:', profileResult);

      // Verify profile was actually created by checking database
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (verifyError || !verifyData?.role) {
        console.error('[AuthContext] Profile verification failed:', verifyError);
        await supabase.auth.signOut();
        setIsSigningUp(false);
        throw new Error('Profile created but verification failed. Please try signing up again.');
      }

      console.log('[AuthContext] Profile verified in database with role:', verifyData.role);

      // Set the role immediately so navigation works
      setUserRole(role);
      console.log('[AuthContext] Role set to:', role);

      // Check onboarding status immediately after profile creation
      await checkOnboardingStatus(data.user.id, role);
      console.log('[AuthContext] Onboarding status checked');

      setLoading(false);

      // Clear the signup flag so auth state changes work normally again
      setIsSigningUp(false);

      // Track sign up event
      trackSignUp('email', role);

      await queueWelcomeMessage(data.user.id);

      return data;
    } catch (error) {
      console.error('[AuthContext] SignUp failed:', error);
      setLoading(false);
      setIsSigningUp(false);
      throw error;
    }
  };

  const signInWithGoogle = async (role: UserRole) => {
    const result = await loadSocialAuth().signInWithGoogle();
    if (!result.success || !result.user) {
      throw new Error(result.error || 'Google sign-in failed');
    }

    // Check if user exists in our database
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', result.user.id)
      .single();

    if (!existingUser) {
      // Create new user record with selected role
      await supabase.from('users').insert({
        id: result.user.id,
        email: result.user.email,
        role,
      });

      // Create profile
      await supabase.from('profiles').insert({
        user_id: result.user.id,
        full_name: result.user.user_metadata?.full_name || result.user.email?.split('@')[0] || 'User',
      });

      // Create role-specific profile
      if (role === 'customer') {
        await supabase.from('customer_profiles').insert({
          id: result.user.id,
        });
      } else {
        await supabase.from('provider_profiles').insert({
          id: result.user.id,
        });
      }

      // Track sign up event for new user
      trackSignUp('google', role);
      await queueWelcomeMessage(result.user.id);
    } else {
      // Track sign in event for existing user
      trackSignIn('google');
    }
  };

  const signInWithApple = async (role: UserRole) => {
    const result = await loadSocialAuth().signInWithApple();
    if (!result.success || !result.user) {
      throw new Error(result.error || 'Apple sign-in failed');
    }

    // Check if user exists in our database
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', result.user.id)
      .single();

    if (!existingUser) {
      // Create new user record with selected role
      await supabase.from('users').insert({
        id: result.user.id,
        email: result.user.email,
        role,
      });

      // Create profile with name from Apple if available
      const fullName = result.user.fullName
        ? `${result.user.fullName.firstName} ${result.user.fullName.lastName}`.trim()
        : result.user.email?.split('@')[0] || 'User';

      await supabase.from('profiles').insert({
        user_id: result.user.id,
        full_name: fullName,
      });

      // Create role-specific profile
      if (role === 'customer') {
        await supabase.from('customer_profiles').insert({
          id: result.user.id,
        });
      } else {
        await supabase.from('provider_profiles').insert({
          id: result.user.id,
        });
      }

      // Track sign up event for new user
      trackSignUp('apple', role);
      await queueWelcomeMessage(result.user.id);
    } else {
      // Track sign in event for existing user
      trackSignIn('apple');
    }
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    if (error) throw error;

    // Track sign out event
    trackSignOut();
  };

  const switchRole = async (role: 'customer' | 'provider') => {
    if (!user) throw new Error('You must be signed in to switch roles');
    if (userRole === role) return;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profileData?.id) {
      throw new Error('Profile not found. Please try again.');
    }

    const { error: roleError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user.id);

    if (roleError) {
      throw new Error(roleError.message || 'Failed to switch role');
    }

    if (role === 'customer') {
      const { error: customerProfileError } = await supabase
        .from('customer_profiles')
        .upsert({ id: profileData.id }, { onConflict: 'id' });

      if (customerProfileError) {
        throw new Error(customerProfileError.message || 'Failed to prepare customer profile');
      }
    } else {
      const { error: providerProfileError } = await supabase
        .from('provider_profiles')
        .upsert({ id: profileData.id }, { onConflict: 'id' });

      if (providerProfileError) {
        throw new Error(providerProfileError.message || 'Failed to prepare provider profile');
      }
    }

    setUserRole(role);
    setSentryTag('user_role', role);

    await locationTrackingService.stop();
    await locationTrackingService.initialize(user.id, role);
    await checkOnboardingStatus(user.id, role);
  };

  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword(email);
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await authService.updatePassword(newPassword);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        needsOnboarding,
        needsVerification,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        switchRole,
        markOnboardingComplete,
        refreshOnboardingStatus,
        refreshVerificationStatus,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

