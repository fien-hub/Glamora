import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listReadFlips,
  listCustomServices,
  approveCustomService,
  rejectCustomService,
  customServiceAlert,
  searchProvidersAdmin,
  getProviderAdmin,
  verifyProvider,
  approveProviderIdentity,
  rejectProviderIdentity,
  suspendProvider,
  listServicesToAdd,
  analyticsSummary,
  listUsers,
  setUserRole,
  getSettings,
  newServiceAlert,
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

// Internal webhook — Supabase DB trigger fires this when a custom service is submitted
// Protected by x-internal-secret header (no JWT needed)
router.post('/internal/custom-service-alert', customServiceAlert);

// Internal webhook — fires when any new service is added (needs admin approval)
router.post('/internal/new-service-alert', newServiceAlert);

// Provider-authenticated endpoint to notify admins of a new service submission
router.post(
  '/notify-new-service',
  authenticate,
  [
    body('serviceId').isUUID().withMessage('serviceId must be a valid UUID'),
    body('serviceName').isString().trim().isLength({ min: 1, max: 200 }),
    body('providerName').optional().isString().trim().isLength({ max: 200 }),
    validate,
  ],
  newServiceAlert
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
  [
    query('q').optional().isString(),
    query('verified').optional().isIn(['true', 'false']),
    query('identityStatus').optional().isIn(['pending', 'under_review', 'approved', 'rejected']),
    validate,
  ],
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
  '/providers/:id/identity/approve',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), body('notes').optional().isString(), validate],
  approveProviderIdentity
);

router.post(
  '/providers/:id/identity/reject',
  authenticate,
  authorize('admin'),
  [param('id').isUUID(), body('reason').optional().isString(), validate],
  rejectProviderIdentity
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
