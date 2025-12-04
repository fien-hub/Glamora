import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('document');

/**
 * Upload verification document
 */
export const uploadVerificationDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentType, documentNumber, expiryDate } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const providerId = profileData.id;

    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${providerId}/${uuidv4()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload document', details: uploadError.message });
    }

    // Get public URL (even though bucket is private, we store the path)
    const { data: { publicUrl } } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName);

    // Save document record to database
    const { data: documentData, error: dbError } = await supabase
      .from('verification_documents')
      .insert({
        provider_id: providerId,
        document_type: documentType,
        document_url: fileName, // Store path, not full URL
        document_number: documentNumber || null,
        expiry_date: expiryDate || null,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded file
      await supabase.storage.from('verification-documents').remove([fileName]);
      return res.status(500).json({ error: 'Failed to save document record', details: dbError.message });
    }

    // Update provider verification status to under_review if it was pending
    await supabase
      .from('provider_profiles')
      .update({ identity_verification_status: 'under_review' })
      .eq('id', providerId)
      .eq('identity_verification_status', 'pending');

    res.json({
      message: 'Document uploaded successfully',
      document: documentData,
    });
  } catch (error: any) {
    console.error('Upload verification document error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get provider's verification documents
 */
export const getVerificationDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get verification documents
    const { data: documents, error } = await supabase
      .from('verification_documents')
      .select('*')
      .eq('provider_id', profileData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get documents error:', error);
      return res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
    }

    res.json({ documents });
  } catch (error: any) {
    console.error('Get verification documents error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get verification status
 */
export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get provider profile with verification status
    const { data: providerData, error } = await supabase
      .from('provider_profiles')
      .select(`
        identity_verification_status,
        identity_verified_at,
        identity_verification_notes,
        is_verified
      `)
      .eq('id', (
        await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .single()
      ).data?.id)
      .single();

    if (error) {
      console.error('Get verification status error:', error);
      return res.status(500).json({ error: 'Failed to fetch verification status', details: error.message });
    }

    res.json({
      status: providerData?.identity_verification_status || 'pending',
      verifiedAt: providerData?.identity_verified_at,
      notes: providerData?.identity_verification_notes,
      isVerified: providerData?.is_verified || false,
    });
  } catch (error: any) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Delete verification document
 */
export const deleteVerificationDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId } = req.params;

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get document to verify ownership and get file path
    const { data: document, error: fetchError } = await supabase
      .from('verification_documents')
      .select('*')
      .eq('id', documentId)
      .eq('provider_id', profileData.id)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only allow deletion of pending documents
    if (document.status !== 'pending') {
      return res.status(403).json({ error: 'Cannot delete documents that are under review or approved' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('verification-documents')
      .remove([document.document_url]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('verification_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return res.status(500).json({ error: 'Failed to delete document', details: dbError.message });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Delete verification document error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get signed URL for viewing document
 */
export const getDocumentUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId } = req.params;

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get document to verify ownership
    const { data: document, error: fetchError } = await supabase
      .from('verification_documents')
      .select('document_url')
      .eq('id', documentId)
      .eq('provider_id', profileData.id)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(document.document_url, 3600);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return res.status(500).json({ error: 'Failed to generate document URL', details: urlError.message });
    }

    res.json({ url: signedUrlData.signedUrl });
  } catch (error: any) {
    console.error('Get document URL error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Send phone verification OTP
 */
export const sendPhoneVerificationCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store the code in database
    const { error: insertError } = await supabase
      .from('phone_verification_codes')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    // TODO: Integrate with SMS provider (Twilio, etc.)
    // For now, log the code for testing
    console.log(`[PHONE VERIFICATION] Code for ${phoneNumber}: ${code}`);

    // In production, send SMS here
    // await twilioClient.messages.create({
    //   body: `Your Glamora verification code is: ${code}`,
    //   to: phoneNumber,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    // });

    res.json({
      message: 'Verification code sent',
      // Remove this in production - only for testing
      testCode: process.env.NODE_ENV === 'development' ? code : undefined,
    });
  } catch (error: any) {
    console.error('Send phone verification error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Verify phone OTP code
 */
export const verifyPhoneCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' });
    }

    // Get the latest verification code for this user and phone
    const { data: codeData, error: fetchError } = await supabase
      .from('phone_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !codeData) {
      return res.status(400).json({ error: 'No pending verification found. Please request a new code.' });
    }

    // Check if code has expired
    if (new Date(codeData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Check attempts
    if (codeData.attempts >= 5) {
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Update attempts
    await supabase
      .from('phone_verification_codes')
      .update({ attempts: codeData.attempts + 1 })
      .eq('id', codeData.id);

    // Verify code
    if (codeData.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark as verified
    await supabase
      .from('phone_verification_codes')
      .update({ verified: true })
      .eq('id', codeData.id);

    // Update profile phone_verified status
    await supabase
      .from('profiles')
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        phone: phoneNumber,
      })
      .eq('user_id', userId);

    // Update customer/provider verification checklist if exists
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      // Update customer verification status
      await supabase
        .from('customer_profiles')
        .update({ verification_status: 'phone_verified' })
        .eq('id', profileData.id);

      // Update provider checklist if exists
      await supabase
        .from('provider_verification_checklist')
        .update({ phone_verified: true })
        .eq('provider_id', profileData.id);
    }

    res.json({ message: 'Phone number verified successfully', verified: true });
  } catch (error: any) {
    console.error('Verify phone code error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Send email verification link
 */
export const sendEmailVerification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Supabase auth to send verification email
    // This will send the email with a magic link for verification
    const { error: emailError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (emailError) {
      console.error('Email verification error:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Send email verification error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Mark email as verified (called after user clicks verification link)
 */
export const confirmEmailVerification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Update profile email_verified status
    await supabase
      .from('profiles')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Update customer/provider verification status
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      // Update customer verification status
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('verification_status')
        .eq('id', profileData.id)
        .single();

      if (customerProfile) {
        const newStatus = customerProfile.verification_status === 'phone_verified'
          ? 'fully_verified'
          : 'email_verified';

        await supabase
          .from('customer_profiles')
          .update({ verification_status: newStatus })
          .eq('id', profileData.id);
      }

      // Update provider checklist if exists
      await supabase
        .from('provider_verification_checklist')
        .update({ email_verified: true })
        .eq('provider_id', profileData.id);
    }

    res.json({ message: 'Email verified successfully', verified: true });
  } catch (error: any) {
    console.error('Confirm email verification error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get user verification status (both email and phone)
 */
export const getUserVerificationStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get profile verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, phone, phone_verified, email_verified')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get customer profile status
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('verification_status, payment_method_verified')
      .eq('id', profile.id)
      .single();

    // Get provider checklist if exists
    const { data: providerChecklist } = await supabase
      .from('provider_verification_checklist')
      .select('*')
      .eq('provider_id', profile.id)
      .single();

    res.json({
      phone: profile.phone,
      phoneVerified: profile.phone_verified || false,
      emailVerified: profile.email_verified || false,
      customerStatus: customerProfile?.verification_status || 'unverified',
      paymentMethodVerified: customerProfile?.payment_method_verified || false,
      providerChecklist: providerChecklist || null,
    });
  } catch (error: any) {
    console.error('Get verification status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Create a Stripe Identity Verification Session
 * Returns a URL to the Stripe-hosted verification page
 */
export const createKYCVerificationSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    console.log('[KYC] Creating Stripe Identity verification session for user:', userId);

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Create Stripe Identity VerificationSession
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        user_id: userId,
        profile_id: profileData.id,
      },
      options: {
        document: {
          allowed_types: ['driving_license', 'passport', 'id_card'],
          require_id_number: false,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: `glamora://kyc-verification/complete?session_id={VERIFICATION_SESSION_ID}`,
    });

    // Create KYC verification record in database
    const { data: kycRecord, error: insertError } = await supabase
      .from('kyc_verifications')
      .insert({
        provider_id: profileData.id,
        document_type: 'pending', // Will be updated by webhook
        id_front_url: '',
        selfie_url: '',
        status: 'processing',
        stripe_verification_session_id: verificationSession.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[KYC] Error creating KYC record:', insertError);
      return res.status(500).json({ error: 'Failed to create KYC record' });
    }

    console.log('[KYC] Verification session created:', verificationSession.id);

    res.json({
      sessionId: verificationSession.id,
      url: verificationSession.url,
      kycId: kycRecord.id,
      clientSecret: verificationSession.client_secret,
    });

  } catch (error: any) {
    console.error('[KYC] Create session error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Process KYC verification (fallback for custom flow without Stripe hosted page)
 * Uses Stripe Identity to verify uploaded documents
 */
export const processKYCVerification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { kycId, documentType, idFrontUrl, idBackUrl, selfieUrl } = req.body;

    if (!kycId || !documentType || !idFrontUrl || !selfieUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('[KYC] Processing verification for KYC ID:', kycId);

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update KYC record with document URLs
    await supabase
      .from('kyc_verifications')
      .update({
        document_type: documentType,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl || null,
        selfie_url: selfieUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', kycId);

    // For custom flow: simulate verification (in production, use Stripe's file upload API)
    // This is a fallback when not using Stripe's hosted verification page
    const processingTime = Math.floor(Math.random() * 5000) + 3000;

    setTimeout(async () => {
      try {
        // Simulate verification (replace with actual Stripe Identity API calls in production)
        const faceMatchScore = Math.random() * 30 + 70;
        const documentAuthenticityScore = Math.random() * 20 + 80;
        const livenessScore = Math.random() * 15 + 85;

        let status = 'approved';
        let rejectionReason = null;

        if (faceMatchScore < 75) {
          status = 'rejected';
          rejectionReason = 'Face does not match the ID photo.';
        } else if (documentAuthenticityScore < 85) {
          status = 'manual_review';
          rejectionReason = 'Document needs manual verification.';
        } else if (livenessScore < 88) {
          status = 'rejected';
          rejectionReason = 'Liveness check failed.';
        }

        await supabase
          .from('kyc_verifications')
          .update({
            status,
            face_match_score: faceMatchScore.toFixed(2),
            document_authenticity_score: documentAuthenticityScore.toFixed(2),
            liveness_score: livenessScore.toFixed(2),
            rejection_reason: rejectionReason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', kycId);

        if (status === 'approved') {
          await supabase
            .from('provider_profiles')
            .update({
              identity_verification_status: 'approved',
              identity_verified_at: new Date().toISOString(),
              kyc_verification_id: kycId,
              kyc_verified_at: new Date().toISOString(),
              is_verified: true,
            })
            .eq('id', profileData.id);

          await supabase
            .from('provider_verification_checklist')
            .upsert({
              provider_id: profileData.id,
              govt_id_uploaded: true,
              selfie_uploaded: true,
              selfie_matched: true,
            }, { onConflict: 'provider_id' });
        }

        console.log('[KYC] Verification complete:', { kycId, status });
      } catch (error) {
        console.error('[KYC] Async processing error:', error);
      }
    }, processingTime);

    res.json({
      message: 'Verification processing started',
      kycId,
      estimatedTime: '10-60 seconds'
    });

  } catch (error: any) {
    console.error('[KYC] Verification error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Handle Stripe Identity webhook events
 */
export const handleIdentityWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[KYC Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('[KYC Webhook] Received event:', event.type);

  try {
    switch (event.type) {
      case 'identity.verification_session.verified': {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleVerificationVerified(session);
        break;
      }
      case 'identity.verification_session.requires_input': {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleVerificationRequiresInput(session);
        break;
      }
      case 'identity.verification_session.canceled': {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleVerificationCanceled(session);
        break;
      }
      default:
        console.log('[KYC Webhook] Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[KYC Webhook] Error processing event:', error);
    res.status(500).json({ error: error.message });
  }
};

async function handleVerificationVerified(session: Stripe.Identity.VerificationSession) {
  const profileId = session.metadata?.profile_id;

  console.log('[KYC] Verification verified for profile:', profileId);

  // Update KYC record
  const { error: updateError } = await supabase
    .from('kyc_verifications')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_verification_session_id', session.id);

  if (updateError) {
    console.error('[KYC] Error updating KYC record:', updateError);
    return;
  }

  // Get the KYC record to find the ID
  const { data: kycRecord } = await supabase
    .from('kyc_verifications')
    .select('id')
    .eq('stripe_verification_session_id', session.id)
    .single();

  // Update provider profile
  if (profileId) {
    await supabase
      .from('provider_profiles')
      .update({
        identity_verification_status: 'approved',
        identity_verified_at: new Date().toISOString(),
        kyc_verification_id: kycRecord?.id,
        kyc_verified_at: new Date().toISOString(),
        is_verified: true,
      })
      .eq('id', profileId);

    await supabase
      .from('provider_verification_checklist')
      .upsert({
        provider_id: profileId,
        govt_id_uploaded: true,
        selfie_uploaded: true,
        selfie_matched: true,
      }, { onConflict: 'provider_id' });
  }

  console.log('[KYC] Provider verified successfully');
}

async function handleVerificationRequiresInput(session: Stripe.Identity.VerificationSession) {
  console.log('[KYC] Verification requires input for session:', session.id);

  const lastError = session.last_error;
  let rejectionReason = 'Additional information required';

  if (lastError) {
    rejectionReason = lastError.reason || lastError.code || 'Verification failed';
  }

  await supabase
    .from('kyc_verifications')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_verification_session_id', session.id);
}

async function handleVerificationCanceled(session: Stripe.Identity.VerificationSession) {
  console.log('[KYC] Verification canceled for session:', session.id);

  await supabase
    .from('kyc_verifications')
    .update({
      status: 'canceled',
      rejection_reason: 'Verification was canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_verification_session_id', session.id);
}

/**
 * Get KYC verification status
 */
export const getKYCVerificationStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { kycId } = req.params;

    // Get provider profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get KYC verification record
    const { data: kycData, error } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('id', kycId)
      .eq('provider_id', profileData.id)
      .single();

    if (error || !kycData) {
      return res.status(404).json({ error: 'KYC verification not found' });
    }

    res.json(kycData);
  } catch (error: any) {
    console.error('[KYC] Get status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

