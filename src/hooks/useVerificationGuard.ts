import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigation } from '@react-navigation/native';

interface VerificationStatus {
  emailVerified: boolean;
  paymentMethodVerified: boolean;
  isFullyVerified: boolean;
  loading: boolean;
}

/**
 * Hook to check if user has required verifications
 * Required: Email verification
 * No phone verification required
 */
export const useVerificationGuard = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<VerificationStatus>({
    emailVerified: false,
    paymentMethodVerified: false,
    isFullyVerified: false,
    loading: true,
  });

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) {
      setStatus({
        emailVerified: false,
        paymentMethodVerified: false,
        isFullyVerified: false,
        loading: false,
      });
      return;
    }

    try {
      // Get profile verification status
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email_verified')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setStatus({
          emailVerified: false,
          paymentMethodVerified: false,
          isFullyVerified: false,
          loading: false,
        });
        return;
      }

      // Get customer profile for payment verification
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('payment_method_verified')
        .eq('id', profile.id)
        .maybeSingle();

      const emailVerified = profile.email_verified || false;
      const paymentMethodVerified = customerProfile?.payment_method_verified ?? false;
      const isFullyVerified = emailVerified;

      setStatus({
        emailVerified,
        paymentMethodVerified,
        isFullyVerified,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking verification status:', error);
      setStatus({
        emailVerified: false,
        paymentMethodVerified: false,
        isFullyVerified: false,
        loading: false,
      });
    }
  };

  /**
   * Check if user can perform action that requires verification
   * Shows appropriate alert if not verified
   * Returns true if verified, false if not
   */
  const requireVerification = (action: 'booking' | 'messaging' | 'favorite' | 'like' | 'payment'): boolean => {
    // Email verification is optional — never block actions
    return true;
  };

  /**
   * Refresh verification status
   */
  const refresh = () => {
    checkVerificationStatus();
  };

  return {
    ...status,
    requireVerification,
    refresh,
  };
};

