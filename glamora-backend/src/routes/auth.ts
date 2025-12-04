import { Router } from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  logout, 
  getCurrentUser,
  resetPassword,
  updatePassword 
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['customer', 'provider']),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('phone').optional().trim(),
    validate,
  ],
  register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
  ],
  login
);

// Logout
router.post('/logout', authenticate, logout);

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Reset password request
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    validate,
  ],
  resetPassword
);

// Update password
router.post(
  '/update-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
    validate,
  ],
  updatePassword
);

export default router;

