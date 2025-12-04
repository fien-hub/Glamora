import { Router } from 'express';
import { body } from 'express-validator';
import { createReview, getProviderReviews } from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('bookingId').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim(),
    validate,
  ],
  createReview
);

router.get('/provider/:providerId', getProviderReviews);

export default router;

