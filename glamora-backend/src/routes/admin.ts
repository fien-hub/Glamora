import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listReadFlips,
  listCustomServices,
  approveCustomService,
  rejectCustomService,
  searchProvidersAdmin,
  getProviderAdmin,
  verifyProvider,
  suspendProvider,
  listServicesToAdd,
  analyticsSummary,
  listUsers,
  setUserRole,
  getSettings,
} from '../controllers/adminController';

const router = Router();

// Admin: inspect read flips
router.get(
  '/read-flips',
  authenticate,
  authorize('admin'),
  [
    query('since').optional().isString().trim().isLength({ min: 1 }),
    query('sinceDays').optional().isInt({ min: 1, max: 3650 }),
    query('receiverId').optional().isUUID(),
    query('messageId').optional().isUUID(),
    validate,
  ],
  listReadFlips
);

// Custom services moderation
router.get(
  '/custom-services',
  authenticate,
  authorize('admin'),
  [query('status').optional().isIn(['pending', 'approved', 'rejected']), validate],
  listCustomServices
);

router.post(
  '/custom-services/:id/approve',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), validate],
  approveCustomService
);

router.post(
  '/custom-services/:id/reject',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), body('reason').optional().isString(), validate],
  rejectCustomService
);

// Providers management
router.get(
  '/providers',
  authenticate,
  authorize('admin'),
  [query('q').optional().isString(), query('verified').optional().isIn(['true', 'false']), validate],
  searchProvidersAdmin
);

router.get(
  '/providers/:id',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), validate],
  getProviderAdmin
);

router.post(
  '/providers/:id/verify',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), body('verified').isBoolean(), validate],
  verifyProvider
);

router.post(
  '/providers/:id/suspend',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), validate],
  suspendProvider
);

// Services to add suggestions
router.get(
  '/services-to-add',
  authenticate,
  authorize('admin'),
  [query('minProviders').optional().isInt({ min: 1, max: 100 }), validate],
  listServicesToAdd
);

// Analytics
router.get(
  '/analytics/summary',
  authenticate,
  authorize('admin'),
  [query('sinceDays').optional().isInt({ min: 1, max: 3650 }), validate],
  analyticsSummary
);

// Settings / roles
router.get(
  '/users',
  authenticate,
  authorize('admin'),
  [query('role').optional().isIn(['admin', 'provider', 'customer']), query('q').optional().isString(), validate],
  listUsers
);

router.patch(
  '/users/:id/role',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), body('role').isIn(['admin', 'provider', 'customer']), validate],
  setUserRole
);

router.get(
  '/settings',
  authenticate,
  authorize('admin'),
  [],
  getSettings
);

export default router;
