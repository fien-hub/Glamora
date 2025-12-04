import { Router } from 'express';
import { body } from 'express-validator';
import {
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  createSetupIntent,
  confirmSetupIntent,
} from '../controllers/paymentMethodController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// Get all payment methods for authenticated user
router.get(
  '/',
  authenticate,
  generalLimiter,
  getPaymentMethods
);

// Create setup intent for adding new payment method
router.post(
  '/setup-intent',
  authenticate,
  generalLimiter,
  createSetupIntent
);

// Confirm setup intent and save payment method
router.post(
  '/confirm-setup',
  authenticate,
  generalLimiter,
  [
    body('setupIntentId').notEmpty().withMessage('Setup intent ID is required'),
    validate,
  ],
  confirmSetupIntent
);

// Add a new payment method
router.post(
  '/',
  authenticate,
  generalLimiter,
  [
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
    body('setAsDefault').optional().isBoolean(),
    validate,
  ],
  addPaymentMethod
);

// Set default payment method
router.patch(
  '/:paymentMethodId/default',
  authenticate,
  generalLimiter,
  setDefaultPaymentMethod
);

// Delete a payment method
router.delete(
  '/:paymentMethodId',
  authenticate,
  generalLimiter,
  deletePaymentMethod
);

export default router;

