import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { logger } from '../utils/logger';
import trainingComplianceIntegrationService from '../services/sms/trainingComplianceIntegrationService';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: errors.array()
      }
    });
  }
  next();
};

// Compliance Assessment Routes
router.post('/assess',
  auth,
  [
    body('companyId').isUUID().withMessage('Invalid company ID'),
    body('framework').isString().withMessage('Framework must be a string'),
    body('scope').isArray().withMessage('Scope must be an array'),
    body('assessmentData').isObject().withMessage('Assessment data must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId, framework, scope, assessmentData } = req.body;

      const assessment = await trainingComplianceIntegrationService.performComplianceAssessment(
        companyId,
        framework,
        scope,
        assessmentData
      );

      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      logger.error('Compliance assessment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'COMPLIANCE_ASSESSMENT_ERROR',
          message: 'Failed to perform compliance assessment',
          details: error.message
        }
      });
    }
  }
);

// Training Compliance Mapping
router.post('/training/mapping',
  auth,
  [
    body('trainingId').isUUID().withMessage('Invalid training ID'),
    body('complianceRequirements').isArray().withMessage('Compliance requirements must be an array'),
    body('mappingCriteria').isObject().withMessage('Mapping criteria must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { trainingId, complianceRequirements, mappingCriteria } = req.body;

      const mapping = await trainingComplianceIntegrationService.mapTrainingToCompliance(
        trainingId,
        complianceRequirements,
        mappingCriteria
      );

      res.json({
        success: true,
        data: mapping
      });
    } catch (error) {
      logger.error('Training compliance mapping error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRAINING_MAPPING_ERROR',
          message: 'Failed to map training to compliance',
          details: error.message
        }
      });
    }
  }
);

// Compliance Gap Analysis
router.post('/gap-analysis',
  auth,
  [
    body('companyId').isUUID().withMessage('Invalid company ID'),
    body('targetFramework').isString().withMessage('Target framework must be a string'),
    body('currentState').isObject().withMessage('Current state must be an object'),
    body('analysisScope').isArray().withMessage('Analysis scope must be an array')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId, targetFramework, currentState, analysisScope } = req.body;

      const gapAnalysis = await trainingComplianceIntegrationService.performComplianceGapAnalysis(
        companyId,
        targetFramework,
        currentState,
        analysisScope
      );

      res.json({
        success: true,
        data: gapAnalysis
      });
    } catch (error) {
      logger.error('Compliance gap analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GAP_ANALYSIS_ERROR',
          message: 'Failed to perform compliance gap analysis',
          details: error.message
        }
      });
    }
  }
);

// Automated Compliance Monitoring
router.post('/monitoring/setup',
  auth,
  [
    body('companyId').isUUID().withMessage('Invalid company ID'),
    body('monitoringRules').isArray().withMessage('Monitoring rules must be an array'),
    body('alertThresholds').isObject().withMessage('Alert thresholds must be an object'),
    body('reportingSchedule').isObject().withMessage('Reporting schedule must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId, monitoringRules, alertThresholds, reportingSchedule } = req.body;

      const monitoring = await trainingComplianceIntegrationService.setupComplianceMonitoring(
        companyId,
        monitoringRules,
        alertThresholds,
        reportingSchedule
      );

      res.json({
        success: true,
        data: monitoring
      });
    } catch (error) {
      logger.error('Compliance monitoring setup error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MONITORING_SETUP_ERROR',
          message: 'Failed to setup compliance monitoring',
          details: error.message
        }
      });
    }
  }
);

// Compliance Reporting
router.get('/reports/:companyId',
  auth,
  [
    param('companyId').isUUID().withMessage('Invalid company ID'),
    query('reportType').isString().withMessage('Report type must be a string'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('framework').optional().isString().withMessage('Framework must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const { reportType, startDate, endDate, framework } = req.query;

      const report = await trainingComplianceIntegrationService.generateComplianceReport(
        companyId,
        reportType as string,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          framework: framework as string
        }
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Compliance reporting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORTING_ERROR',
          message: 'Failed to generate compliance report',
          details: error.message
        }
      });
    }
  }
);

// Compliance Training Effectiveness
router.get('/training/effectiveness/:companyId',
  auth,
  [
    param('companyId').isUUID().withMessage('Invalid company ID'),
    query('framework').optional().isString().withMessage('Framework must be a string'),
    query('timeframe').optional().isString().withMessage('Timeframe must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const { framework, timeframe } = req.query;

      const effectiveness = await trainingComplianceIntegrationService.measureTrainingEffectiveness(
        companyId,
        {
          framework: framework as string,
          timeframe: timeframe as string
        }
      );

      res.json({
        success: true,
        data: effectiveness
      });
    } catch (error) {
      logger.error('Training effectiveness measurement error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EFFECTIVENESS_ERROR',
          message: 'Failed to measure training effectiveness',
          details: error.message
        }
      });
    }
  }
);

// Compliance Forecasting
router.post('/forecasting',
  auth,
  [
    body('companyId').isUUID().withMessage('Invalid company ID'),
    body('forecastingParameters').isObject().withMessage('Forecasting parameters must be an object'),
    body('historicalData').isArray().withMessage('Historical data must be an array'),
    body('horizon').isInt({ min: 1, max: 365 }).withMessage('Horizon must be between 1 and 365 days')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId, forecastingParameters, historicalData, horizon } = req.body;

      const forecast = await trainingComplianceIntegrationService.forecastComplianceMetrics(
        companyId,
        forecastingParameters,
        historicalData,
        horizon
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Compliance forecasting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECASTING_ERROR',
          message: 'Failed to forecast compliance metrics',
          details: error.message
        }
      });
    }
  }
);

// Regulatory Change Impact Assessment
router.post('/regulatory/impact-assessment',
  auth,
  [
    body('companyId').isUUID().withMessage('Invalid company ID'),
    body('regulatoryChange').isObject().withMessage('Regulatory change must be an object'),
    body('impactScope').isArray().withMessage('Impact scope must be an array'),
    body('assessmentCriteria').isObject().withMessage('Assessment criteria must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId, regulatoryChange, impactScope, assessmentCriteria } = req.body;

      const impactAssessment = await trainingComplianceIntegrationService.assessRegulatoryChangeImpact(
        companyId,
        regulatoryChange,
        impactScope,
        assessmentCriteria
      );

      res.json({
        success: true,
        data: impactAssessment
      });
    } catch (error) {
      logger.error('Regulatory impact assessment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'IMPACT_ASSESSMENT_ERROR',
          message: 'Failed to assess regulatory change impact',
          details: error.message
        }
      });
    }
  }
);

export default router;
