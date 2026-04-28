import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPaymentIntent,
  confirmPayment,
  verifyRevenueCatBookingPayment,
  handleWebhook,
  createConnectedAccount,
  createAccountLink,
  getAccountStatus,
  getCustomerPayments,
  getProviderPayments,
  getPaymentDetails,
  requestRefund,
  getCustomerPaymentStats
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paymentLimiter, paymentReadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/create-intent',
  authenticate,
  paymentLimiter,
  [
    body('bookingId').isUUID(),
    validate,
  ],
  createPaymentIntent
);

router.post(
  '/confirm',
  authenticate,
  paymentLimiter,
  [
    body('paymentIntentId').notEmpty(),
    body('bookingId').isUUID(),
    validate,
  ],
  confirmPayment
);

router.post(
  '/revenuecat/verify-booking-payment',
  authenticate,
  paymentLimiter,
  [
    body('appUserId').notEmpty(),
    body('productId').notEmpty(),
    body('transactionId').notEmpty(),
    body('platform').isIn(['ios', 'android']),
    validate,
  ],
  verifyRevenueCatBookingPayment
);

// Provider payout onboarding endpoints
router.post(
  '/connect/create-account',
  authenticate,
  [
    body('email').isEmail(),
    body('businessName').notEmpty(),
    body('country').optional().isString(),
    validate,
  ],
  createConnectedAccount
);

router.post(
  '/connect/account-link',
  authenticate,
  [
    body('returnUrl').optional().isURL(),
    body('refreshUrl').optional().isURL(),
    validate,
  ],
  createAccountLink
);

router.get(
  '/connect/account-status',
  authenticate,
  getAccountStatus
);

// Legacy billing webhook (no auth required)
router.post('/webhook', handleWebhook);

// Payment history endpoints (use read limiter - more permissive)
router.get(
  '/customer/history',
  authenticate,
  paymentReadLimiter,
  getCustomerPayments
);

router.get(
  '/provider/history',
  authenticate,
  paymentReadLimiter,
  getProviderPayments
);

router.get(
  '/details/:paymentId',
  authenticate,
  paymentReadLimiter,
  getPaymentDetails
);

// Payment statistics (use read limiter)
router.get(
  '/customer/stats',
  authenticate,
  paymentReadLimiter,
  getCustomerPaymentStats
);

// Refund endpoint (use payment limiter - more restrictive)
router.post(
  '/refund',
  authenticate,
  paymentLimiter,
  [
    body('paymentId').isUUID(),
    body('reason').notEmpty(),
    body('amount').optional().isFloat({ min: 0 }),
    validate,
  ],
  requestRefund
);

export default router;

