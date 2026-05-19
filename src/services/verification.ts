import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export type DocumentType = 'drivers_license' | 'passport' | 'national_id' | 'business_license' | 'certification' | 'professional_license' | 'other';
export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface VerificationDocument {
  id: string;
  provider_id: string;
  document_type: DocumentType;
  document_url: string;
  document_number?: string;
  expiry_date?: string;
  status: VerificationStatus;
  rejection_reason?: string;
  uploaded_at: string;
  reviewed_at?: string;
  notes?: string;
}

export interface VerificationStatusResponse {
  status: VerificationStatus;
  verifiedAt?: string;
  notes?: string;
  isVerified: boolean;
}

/**
 * Upload verification document
 */
export const uploadVerificationDocument = async (
  file: {
    uri: string;
    name: string;
    type: string;
  },
  documentType: DocumentType,
  documentNumber?: string,
  expiryDate?: string
): Promise<{ message: string; document: VerificationDocument }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('document', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    formData.append('documentType', documentType);
    if (documentNumber) formData.append('documentNumber', documentNumber);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    const response = await fetch(`${API_URL}/api/verification/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload document');
    }

    return data;
  } catch (error: any) {
    console.error('Upload verification document error:', error);
    throw error;
  }
};

/**
 * Get provider's verification documents
 */
export const getVerificationDocuments = async (): Promise<{ documents: VerificationDocument[] }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch documents');
    }

    return data;
  } catch (error: any) {
    console.error('Get verification documents error:', error);
    throw error;
  }
};

/**
 * Get verification status (provider identity verification)
 */
export const getVerificationStatus = async (): Promise<VerificationStatusResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    // Query Supabase directly instead of backend API to avoid network errors
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (!profileData) {
      throw new Error('Profile not found');
    }

    // Get provider profile with verification status
    const { data: providerData, error } = await supabase
      .from('provider_profiles')
      .select(`
        identity_verification_status,
        identity_verified_at,
        identity_verification_notes,
        is_verified
      `)
      .eq('id', profileData.id)
      .maybeSingle();

    if (error) {
      console.error('Get verification status error:', error);
      throw new Error('Failed to fetch verification status');
    }

    return {
      status: providerData?.identity_verification_status || 'pending',
      verifiedAt: providerData?.identity_verified_at,
      notes: providerData?.identity_verification_notes,
      isVerified: providerData?.identity_verification_status === 'approved',
    };
  } catch (error: any) {
    console.error('Get verification status error:', error);
    throw error;
  }
};

/**
 * Delete verification document
 */
export const deleteVerificationDocument = async (documentId: string): Promise<{ message: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete document');
    }

    return data;
  } catch (error: any) {
    console.error('Delete verification document error:', error);
    throw error;
  }
};

// ============================================
// Phone Verification
// ============================================

export interface PhoneVerificationResponse {
  message: string;
  testCode?: string; // Only in development
}

/**
 * Send phone verification OTP code
 */
export const sendPhoneVerificationCode = async (phoneNumber: string): Promise<PhoneVerificationResponse> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/phone/send-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }

    return data;
  } catch (error: any) {
    console.error('Send phone verification code error:', error);
    throw error;
  }
};

/**
 * Verify phone OTP code
 */
export const verifyPhoneCode = async (phoneNumber: string, code: string): Promise<{ message: string; verified: boolean }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/phone/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify code');
    }

    return data;
  } catch (error: any) {
    console.error('Verify phone code error:', error);
    throw error;
  }
};

// ============================================
// Email Verification
// ============================================

/**
 * Send email verification link
 */
export const sendEmailVerification = async (): Promise<{ message: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/email/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send verification email');
    }

    return data;
  } catch (error: any) {
    console.error('Send email verification error:', error);
    throw error;
  }
};

/**
 * Confirm email verification
 */
export const confirmEmailVerification = async (): Promise<{ message: string; verified: boolean }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/api/verification/email/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to confirm email');
    }

    return data;
  } catch (error: any) {
    console.error('Confirm email verification error:', error);
    throw error;
  }
};

// ============================================
// User Verification Status
// ============================================

export interface UserVerificationStatus {
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  customerStatus: 'unverified' | 'email_verified' | 'phone_verified' | 'fully_verified';
  paymentMethodVerified: boolean;
  providerChecklist: {
    govt_id_uploaded: boolean;
    selfie_uploaded: boolean;
    selfie_matched: boolean;
    phone_verified: boolean;
    email_verified: boolean;
    profile_photo_uploaded: boolean;
    portfolio_uploaded: boolean;
    services_added: boolean;
    business_name_added: boolean;
    certifications_uploaded: boolean;
    professional_license_uploaded: boolean;
    social_media_linked: boolean;
    required_items_complete: number;
    optional_items_complete: number;
    total_progress_percent: number;
  } | null;
}

/**
 * Get user's complete verification status
 */
export const getUserVerificationStatus = async (): Promise<UserVerificationStatus> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    // Query Supabase directly instead of backend API to avoid network errors
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone, phone_verified, email_verified')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get customer profile status
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('verification_status, payment_method_verified')
      .eq('id', profile.id)
      .maybeSingle();

    // Get provider checklist if exists
    const { data: providerChecklist } = await supabase
      .from('provider_verification_checklist')
      .select('*')
      .eq('provider_id', profile.id)
      .maybeSingle();

    if (__DEV__) {
      console.log('[Verification] Fetched user verification flags', {
        userId: session.user.id,
        profileId: profile.id,
        emailVerified: profile.email_verified || false,
        phoneVerified: profile.phone_verified || false,
        customerVerificationStatus: customerProfile?.verification_status || 'unverified',
        paymentMethodVerified: customerProfile?.payment_method_verified ?? false,
      });
    }

    return {
      phone: profile.phone,
      phoneVerified: profile.phone_verified || false,
      emailVerified: profile.email_verified || false,
      customerStatus: customerProfile?.verification_status || 'unverified',
      paymentMethodVerified: customerProfile?.payment_method_verified ?? false,
      providerChecklist: providerChecklist || null,
    };
  } catch (error: any) {
    console.error('Get user verification status error:', error);
    throw error;
  }
};
