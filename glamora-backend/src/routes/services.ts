import { Router } from 'express';
import { getCategories, getServices } from '../controllers/serviceController';

const router = Router();

router.get('/categories', getCategories);
router.get('/', getServices);

export default router;

