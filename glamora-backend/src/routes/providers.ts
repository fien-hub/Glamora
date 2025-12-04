import { Router } from 'express';
import { searchProviders, getProviderById, getProviderServices } from '../controllers/providerController';

const router = Router();

router.get('/search', searchProviders);
router.get('/:id', getProviderById);
router.get('/:id/services', getProviderServices);

export default router;

