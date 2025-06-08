import express from 'express';
import { authenticate, requireSameCompany } from '../../middleware/auth';

// Import SMS route modules
import documentsRoutes from './documents';
import workflowsRoutes from './workflows';
import reviewsRoutes from './reviews';
import auditsRoutes from './audits';
import incidentsRoutes from './incidents';
import trainingsRoutes from './trainings';
import riskAssessmentsRoutes from './riskAssessments';
import dashboardRoutes from './dashboard';

const router = express.Router();

// Apply authentication and company authorization to all SMS routes
router.use(authenticate);
router.use(requireSameCompany);

// Mount SMS route modules
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/audits', auditsRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/trainings', trainingsRoutes);
router.use('/risk-assessments', riskAssessmentsRoutes);

// SMS API information endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'SMS Management API',
    version: '1.0.0',
    description: 'Safety Management System API endpoints',
    modules: {
      dashboard: '/dashboard',
      documents: '/documents',
      workflows: '/workflows',
      reviews: '/reviews',
      audits: '/audits',
      incidents: '/incidents',
      trainings: '/trainings',
      riskAssessments: '/risk-assessments',
    },
  });
});

export default router;
