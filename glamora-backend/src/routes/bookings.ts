import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createBooking, 
  getBookings, 
  getBookingById, 
  updateBookingStatus,
  cancelBooking 
} from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('providerServiceId').isUUID(),
    body('scheduledDate').isISO8601(),
    body('scheduledTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('address').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('state').trim().notEmpty(),
    body('zipCode').trim().notEmpty(),
    body('notes').optional().trim(),
    validate,
  ],
  createBooking
);

router.get('/', authenticate, getBookings);
router.get('/:id', authenticate, getBookingById);
router.patch('/:id/status', authenticate, updateBookingStatus);
router.post('/:id/cancel', authenticate, cancelBooking);

export default router;

