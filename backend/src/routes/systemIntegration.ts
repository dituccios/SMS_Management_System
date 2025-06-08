import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth';
import systemIntegrationService from '../services/integration/systemIntegrationService';
import incidentDocumentIntegrationService from '../services/integration/incidentDocumentIntegrationService';
import documentAuditTrackingService from '../services/audit/documentAuditTrackingService';
import advancedComplianceService from '../services/compliance/advancedComplianceService';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * @swagger
 * /api/v1/system/health:
 *   get:
 *     summary: Perform system health check
 *     tags: [System Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health status
 */
router.get('/health',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: express.Request, res: express.Response) => {
    try {
      const healthCheck = await systemIntegrationService.performSystemHealthCheck();

      res.json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      logger.error('Failed to perform system health check:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Failed to perform system health check'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/system/tests/e2e:
 *   post:
 *     summary: Execute end-to-end tests
 *     tags: [System Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test execution results
 */
router.post('/tests/e2e',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: express.Request, res: express.Response) => {
    try {
      const testResults = await systemIntegrationService.executeEndToEndTests();

      res.json({
        success: true,
        data: testResults
      });
    } catch (error) {
      logger.error('Failed to execute end-to-end tests:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'E2E_TESTS_FAILED',
          message: 'Failed to execute end-to-end tests'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/system/security-compliance-review:
 *   post:
 *     summary: Perform security and compliance review
 *     tags: [System Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security and compliance review results
 */
router.post('/security-compliance-review',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  async (req: express.Request, res: express.Response) => {
    try {
      const review = await systemIntegrationService.performSecurityComplianceReview();

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      logger.error('Failed to perform security and compliance review:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REVIEW_FAILED',
          message: 'Failed to perform security and compliance review'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/system/optimize:
 *   post:
 *     summary: Optimize system performance
 *     tags: [System Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance optimization recommendations
 */
router.post('/optimize',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: express.Request, res: express.Response) => {
    try {
      const optimizations = await systemIntegrationService.optimizeSystemPerformance();

      res.json({
        success: true,
        data: optimizations
      });
    } catch (error) {
      logger.error('Failed to optimize system performance:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OPTIMIZATION_FAILED',
          message: 'Failed to optimize system performance'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/system/integration/validate:
 *   post:
 *     summary: Validate system integration
 *     tags: [System Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration validation results
 */
router.post('/integration/validate',
  authenticateToken,
  requireRole(['ADMIN']),
  async (req: express.Request, res: express.Response) => {
    try {
      const validation = await systemIntegrationService.validateSystemIntegration();

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Failed to validate system integration:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Failed to validate system integration'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/incidents/{incidentId}/documents:
 *   post:
 *     summary: Link document to incident
 *     tags: [Incident Document Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - linkType
 *             properties:
 *               documentId:
 *                 type: string
 *               linkType:
 *                 type: string
 *                 enum: [EVIDENCE, PROCEDURE, POLICY, REPORT, COMMUNICATION, REMEDIATION]
 *               description:
 *                 type: string
 *               relevanceScore:
 *                 type: number
 *     responses:
 *       200:
 *         description: Document linked successfully
 */
router.post('/incidents/:incidentId/documents',
  authenticateToken,
  [
    param('incidentId').isString().notEmpty(),
    body('documentId').isString().notEmpty(),
    body('linkType').isIn(['EVIDENCE', 'PROCEDURE', 'POLICY', 'REPORT', 'COMMUNICATION', 'REMEDIATION']),
    body('description').optional().isString(),
    body('relevanceScore').optional().isNumeric()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { incidentId } = req.params;
      const { documentId, linkType, description, relevanceScore } = req.body;
      const { userId } = req.user as any;

      await incidentDocumentIntegrationService.linkDocumentToIncident({
        incidentId,
        documentId,
        linkType,
        description,
        relevanceScore,
        addedBy: userId,
        addedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Document linked to incident successfully'
      });
    } catch (error) {
      logger.error('Failed to link document to incident:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LINK_FAILED',
          message: 'Failed to link document to incident'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/incidents/{incidentId}/documents:
 *   get:
 *     summary: Get documents linked to incident
 *     tags: [Incident Document Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: linkType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Linked documents
 */
router.get('/incidents/:incidentId/documents',
  authenticateToken,
  [
    param('incidentId').isString().notEmpty(),
    query('linkType').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { incidentId } = req.params;
      const { linkType } = req.query;

      const documents = await incidentDocumentIntegrationService.getIncidentDocuments(
        incidentId,
        linkType as string
      );

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error('Failed to get incident documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_DOCUMENTS_FAILED',
          message: 'Failed to get incident documents'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/incidents/{incidentId}/evidence-collection:
 *   post:
 *     summary: Initiate evidence collection workflow
 *     tags: [Incident Document Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collectionPlan
 *               - assignedTo
 *               - dueDate
 *             properties:
 *               collectionPlan:
 *                 type: object
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Evidence collection workflow initiated
 */
router.post('/incidents/:incidentId/evidence-collection',
  authenticateToken,
  [
    param('incidentId').isString().notEmpty(),
    body('collectionPlan').isObject(),
    body('assignedTo').isArray(),
    body('dueDate').isISO8601()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { incidentId } = req.params;
      const { collectionPlan, assignedTo, dueDate } = req.body;

      const workflowId = await incidentDocumentIntegrationService.initiateEvidenceCollection({
        incidentId,
        workflowId: crypto.randomUUID(),
        collectionPlan,
        collectedEvidence: [],
        status: 'PLANNED',
        assignedTo,
        dueDate: new Date(dueDate)
      });

      res.json({
        success: true,
        data: { workflowId }
      });
    } catch (error) {
      logger.error('Failed to initiate evidence collection:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EVIDENCE_COLLECTION_FAILED',
          message: 'Failed to initiate evidence collection'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{documentId}/audit:
 *   get:
 *     summary: Get document audit trail
 *     tags: [Document Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Document audit trail
 */
router.get('/documents/:documentId/audit',
  authenticateToken,
  [
    param('documentId').isString().notEmpty(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { documentId } = req.params;
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      const analytics = await documentAuditTrackingService.getDocumentAccessAnalytics(
        [documentId],
        dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get document audit trail:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_TRAIL_FAILED',
          message: 'Failed to get document audit trail'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/compliance/dashboard:
 *   get:
 *     summary: Get compliance dashboard
 *     tags: [Advanced Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance dashboard data
 */
router.get('/compliance/dashboard',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER']),
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;

      const dashboard = await advancedComplianceService.generateComplianceDashboard(companyId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to get compliance dashboard:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_FAILED',
          message: 'Failed to get compliance dashboard'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/compliance/reports/regulatory:
 *   post:
 *     summary: Generate regulatory report
 *     tags: [Advanced Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - framework
 *               - reportType
 *             properties:
 *               framework:
 *                 type: string
 *               reportType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Regulatory report generated
 */
router.post('/compliance/reports/regulatory',
  authenticateToken,
  requireRole(['ADMIN', 'COMPLIANCE_OFFICER']),
  [
    body('framework').isString().notEmpty(),
    body('reportType').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { framework, reportType } = req.body;

      const report = await advancedComplianceService.generateRegulatoryReport(
        companyId,
        framework,
        reportType
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate regulatory report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: 'Failed to generate regulatory report'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/compliance/risk-assessment:
 *   post:
 *     summary: Perform compliance risk assessment
 *     tags: [Advanced Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk assessment results
 */
router.post('/compliance/risk-assessment',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR', 'COMPLIANCE_OFFICER']),
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;

      const riskAssessment = await advancedComplianceService.performComplianceRiskAssessment(companyId);

      res.json({
        success: true,
        data: riskAssessment
      });
    } catch (error) {
      logger.error('Failed to perform compliance risk assessment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RISK_ASSESSMENT_FAILED',
          message: 'Failed to perform compliance risk assessment'
        }
      });
    }
  }
);

export default router;
