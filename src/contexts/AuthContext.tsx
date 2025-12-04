import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, authService, dbService } from '../services/supabase';
import { UserRole } from '../types';
import { signInWithGoogle as googleSignIn, signInWithApple as appleSignIn, configureGoogleSignIn } from '../utils/socialAuth';
import { trackSignUp, trackSignIn, trackSignOut, trackLoginAttempt, trackSessionTimeout } from '../utils/analytics';
import sessionManager from '../utils/sessionManager';
import { setSentryUser, clearSentryUser, setSentryTag } from '../services/sentry';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  needsOnboarding: boolean;
  needsVerification: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, firstName: string, lastName: string, phone?: string) => Promise<void>;
  signInWithGoogle: (role: UserRole) => Promise<void>;
  signInWithApple: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In
    configureGoogleSignIn();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        // Initialize session manager when user is authenticated
        sessionManager.initialize();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Don't fetch role if we're in the middle of signup - signUp function handles it
        if (!isSigningUp) {
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
        setUserRole(null);
        setLoading(false);
        // Stop session monitoring on sign out
        sessionManager.stopMonitoring();

        // Clear Sentry user context
        clearSentryUser();
      }
    });

    // Monitor app state changes to update activity
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
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

  const fetchUserRole = async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching role for user:', userId);

      // First try the users table
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (data?.role) {
        console.log('[AuthContext] User role fetched from users table:', data.role);
        setUserRole(data.role as UserRole);
        setSentryTag('user_role', data.role);
        await checkOnboardingStatus(userId, data.role as UserRole);
        return;
      }

      // Fallback: try profiles table
      if (error) {
        console.log('[AuthContext] Users table lookup failed, trying profiles table');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (profileData?.role) {
          console.log('[AuthContext] User role fetched from profiles table:', profileData.role);
          setUserRole(profileData.role as UserRole);
          setSentryTag('user_role', profileData.role);
          await checkOnboardingStatus(userId, profileData.role as UserRole);
          return;
        }

        if (profileError) {
          // User might be in onboarding - this is expected for new signups
          console.log('[AuthContext] No profile found yet - user may be completing onboarding');
        }
      }
    } catch (error) {
      console.error('[AuthContext] Exception fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async (userId: string) => {
    try {
      // Check if user has verified either email or phone
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email_verified, phone_verified')
        .eq('user_id', userId)
        .single();

      const isVerified = profileData?.email_verified || profileData?.phone_verified;
      console.log('[AuthContext] Verification status:', {
        email_verified: profileData?.email_verified,
        phone_verified: profileData?.phone_verified,
        isVerified
      });

      setNeedsVerification(!isVerified);
      return isVerified;
    } catch (error) {
      console.error('[AuthContext] Error checking verification status:', error);
      // Default to needing verification if there's an error
      setNeedsVerification(true);
      return false;
    }
  };

  const checkOnboardingStatus = async (userId: string, role: UserRole) => {
    try {
      // First check verification status
      const isVerified = await checkVerificationStatus(userId);

      // If not verified, don't bother checking onboarding yet
      if (!isVerified) {
        setNeedsOnboarding(false); // Will be checked after verification
        return;
      }

      // Get profile id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileData) {
        setNeedsOnboarding(true);
        return;
      }

      // Check role-specific onboarding status
      if (role === 'customer') {
        const { data: customerProfile } = await supabase
          .from('customer_profiles')
          .select('onboarding_completed')
          .eq('id', profileData.id)
          .single();

        setNeedsOnboarding(!customerProfile?.onboarding_completed);
      } else if (role === 'provider') {
        const { data: providerProfile } = await supabase
          .from('provider_profiles')
          .select('onboarding_completed')
          .eq('id', profileData.id)
          .single();

        setNeedsOnboarding(!providerProfile?.onboarding_completed);
      }
    } catch (error) {
      console.error('[AuthContext] Error checking onboarding status:', error);
      // Default to needing onboarding if there's an error
      setNeedsOnboarding(true);
    }
  };

  const refreshOnboardingStatus = async () => {
    if (user && userRole) {
      await checkOnboardingStatus(user.id, userRole);
    }
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

      // Set the role immediately so navigation works
      setUserRole(role);
      console.log('[AuthContext] Role set to:', role);

      // Check onboarding status immediately after profile creation
      await checkOnboardingStatus(data.user.id, role);
      console.log('[AuthContext] Onboarding status checked');

      // Clear the signup flag so auth state changes work normally again
      setIsSigningUp(false);

      // Track sign up event
      trackSignUp('email', role);

      return data;
    } catch (error) {
      console.error('[AuthContext] SignUp failed:', error);
      setIsSigningUp(false);
      throw error;
    }
  };

  const signInWithGoogle = async (role: UserRole) => {
    const result = await googleSignIn();
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
    } else {
      // Track sign in event for existing user
      trackSignIn('google');
    }
  };

  const signInWithApple = async (role: UserRole) => {
    const result = await appleSignIn();
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
        refreshOnboardingStatus,
        refreshVerificationStatus,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

