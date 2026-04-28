import { Router, raw } from 'express';
import {
  uploadVerificationDocument,
  getVerificationDocuments,
  getVerificationStatus,
  deleteVerificationDocument,
  getDocumentUrl,
  uploadMiddleware,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  sendEmailVerification,
  confirmEmailVerification,
  getUserVerificationStatus,
  createKYCVerificationSession,
  processKYCVerification,
  getKYCVerificationStatus,
  handleIdentityWebhook,
} from '../controllers/verificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// Phone Verification
// ============================================

// Send phone verification OTP
router.post(
  '/phone/send-code',
  authenticate,
  sendPhoneVerificationCode
);

// Verify phone OTP code
router.post(
  '/phone/verify',
  authenticate,
  verifyPhoneCode
);

// ============================================
// Email Verification
// ============================================

// Send email verification link
router.post(
  '/email/send',
  authenticate,
  sendEmailVerification
);

// Confirm email verification
router.post(
  '/email/confirm',
  authenticate,
  confirmEmailVerification
);

// ============================================
// General Verification Status
// ============================================

// Get user's complete verification status
router.get(
  '/user-status',
  authenticate,
  getUserVerificationStatus
);

// ============================================
// Document Verification (Provider)
// ============================================

// Upload verification document
router.post(
  '/upload',
  authenticate,
  uploadMiddleware,
  uploadVerificationDocument
);

// Get provider's verification documents
router.get(
  '/documents',
  authenticate,
  getVerificationDocuments
);

// Get verification status (provider identity)
router.get(
  '/status',
  authenticate,
  getVerificationStatus
);

// Get signed URL for viewing document
router.get(
  '/documents/:documentId/url',
  authenticate,
  getDocumentUrl
);

// Delete verification document
router.delete(
  '/documents/:documentId',
  authenticate,
  deleteVerificationDocument
);

// ============================================
// KYC Verification (Government ID + Selfie)
// ============================================

// Create hosted identity verification session
router.post(
  '/kyc/create-session',
  authenticate,
  createKYCVerificationSession
);

// Process KYC verification (fallback for custom flow)
router.post(
  '/kyc/verify',
  authenticate,
  processKYCVerification
);

// Get KYC verification status
router.get(
  '/kyc/:kycId/status',
  authenticate,
  getKYCVerificationStatus
);

// Hosted identity verification webhook (no auth - verified by signature)
router.post(
  '/kyc/webhook',
  raw({ type: 'application/json' }),
  handleIdentityWebhook
);

export default router;
