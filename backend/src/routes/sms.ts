import express from 'express';
import { authenticate, requireSameCompany } from '../middleware/auth';
import smsRoutes from './sms/index';

const router = express.Router();

// Apply authentication and company authorization to all SMS routes
router.use(authenticate);
router.use(requireSameCompany);

// Mount SMS routes
router.use('/', smsRoutes);

export default router;
