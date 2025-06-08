import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import complianceDataAnalysisService from '../../services/compliance/complianceDataAnalysisService';
import complianceForecastingService from '../../services/compliance/complianceForecastingService';
import auditLoggingService from '../../services/audit/auditLoggingService';
import { logger } from '../../utils/logger';

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(rateLimiter);

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Create Time Series Forecast
router.post('/time-series',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    body('framework').isString().notEmpty().withMessage('Framework is required'),
    body('metric').isString().notEmpty().withMessage('Metric is required'),
    body('horizon').isInt({ min: 1, max: 365 }).withMessage('Horizon must be between 1 and 365 days'),
    body('modelType').optional().isIn(['ARIMA', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION', 'NEURAL_NETWORK', 'ENSEMBLE'])
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, metric, horizon, modelType = 'ARIMA' } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const forecast = await complianceForecastingService.createTimeSeriesForecast(
        companyId,
        framework,
        metric,
        horizon,
        modelType
      );

      // Log the forecast creation
      await auditLoggingService.logEvent({
        eventType: 'API_CALL',
        category: 'COMPLIANCE_FORECASTING',
        action: 'TIME_SERIES_FORECAST_CREATED',
        description: `Time series forecast created for ${framework}:${metric}`,
        userId: req.user?.id,
        companyId,
        resourceType: 'TIME_SERIES_FORECAST',
        resourceId: forecast.forecastId,
        metadata: {
          framework,
          metric,
          horizon,
          modelType
        },
        tags: ['compliance', 'forecasting', 'time-series']
      });

      res.json({
        success: true,
        message: 'Time series forecast created successfully',
        data: forecast
      });
    } catch (error) {
      logger.error('Failed to create time series forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create time series forecast',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Create Scenario Forecast
router.post('/scenarios',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    body('framework').isString().notEmpty().withMessage('Framework is required'),
    body('metric').isString().notEmpty().withMessage('Metric is required'),
    body('scenarios').isArray().withMessage('Scenarios must be an array'),
    body('scenarios.*.name').isString().notEmpty().withMessage('Scenario name is required'),
    body('scenarios.*.description').isString().notEmpty().withMessage('Scenario description is required'),
    body('scenarios.*.probability').isFloat({ min: 0, max: 1 }).withMessage('Probability must be between 0 and 1')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, metric, scenarios } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const forecast = await complianceForecastingService.createScenarioForecast(
        companyId,
        framework,
        metric,
        scenarios
      );

      // Log the forecast creation
      await auditLoggingService.logEvent({
        eventType: 'API_CALL',
        category: 'COMPLIANCE_FORECASTING',
        action: 'SCENARIO_FORECAST_CREATED',
        description: `Scenario forecast created for ${framework}:${metric}`,
        userId: req.user?.id,
        companyId,
        resourceType: 'SCENARIO_FORECAST',
        resourceId: forecast.forecastId,
        metadata: {
          framework,
          metric,
          scenarioCount: scenarios.length
        },
        tags: ['compliance', 'forecasting', 'scenarios']
      });

      res.json({
        success: true,
        message: 'Scenario forecast created successfully',
        data: forecast
      });
    } catch (error) {
      logger.error('Failed to create scenario forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create scenario forecast',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Perform What-If Analysis
router.post('/what-if',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    body('framework').isString().notEmpty().withMessage('Framework is required'),
    body('metric').isString().notEmpty().withMessage('Metric is required'),
    body('variables').isArray().withMessage('Variables must be an array'),
    body('variables.*.name').isString().notEmpty().withMessage('Variable name is required'),
    body('variables.*.baseValue').isNumeric().withMessage('Base value must be numeric'),
    body('variables.*.range.min').isNumeric().withMessage('Range min must be numeric'),
    body('variables.*.range.max').isNumeric().withMessage('Range max must be numeric')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, metric, variables } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const analysis = await complianceForecastingService.performWhatIfAnalysis(
        companyId,
        framework,
        metric,
        variables
      );

      // Log the analysis
      await auditLoggingService.logEvent({
        eventType: 'API_CALL',
        category: 'COMPLIANCE_FORECASTING',
        action: 'WHAT_IF_ANALYSIS_PERFORMED',
        description: `What-if analysis performed for ${framework}:${metric}`,
        userId: req.user?.id,
        companyId,
        resourceType: 'WHAT_IF_ANALYSIS',
        resourceId: analysis.analysisId,
        metadata: {
          framework,
          metric,
          variableCount: variables.length
        },
        tags: ['compliance', 'forecasting', 'what-if']
      });

      res.json({
        success: true,
        message: 'What-if analysis completed successfully',
        data: analysis
      });
    } catch (error) {
      logger.error('Failed to perform what-if analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform what-if analysis',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Calculate Confidence Intervals
router.post('/:forecastId/confidence',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    param('forecastId').isUUID().withMessage('Valid forecast ID is required'),
    body('level').optional().isFloat({ min: 0.5, max: 0.99 }).withMessage('Confidence level must be between 0.5 and 0.99'),
    body('method').optional().isIn(['BOOTSTRAP', 'ANALYTICAL', 'MONTE_CARLO']).withMessage('Invalid confidence method')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { forecastId } = req.params;
      const { level = 0.95, method = 'BOOTSTRAP' } = req.body;

      // Get forecast predictions (simplified - in real implementation, fetch from database)
      const predictions = []; // This would be fetched from the database

      const confidence = await complianceForecastingService.calculateConfidenceIntervals(
        predictions,
        level,
        method
      );

      res.json({
        success: true,
        message: 'Confidence intervals calculated successfully',
        data: confidence
      });
    } catch (error) {
      logger.error('Failed to calculate confidence intervals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate confidence intervals',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get Forecasts
router.get('/',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST', 'VIEWER']),
  [
    query('framework').optional().isString(),
    query('metric').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, metric, limit = 10, offset = 0 } = req.query;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      // In a real implementation, this would fetch from database with filters
      const forecasts = []; // Placeholder

      res.json({
        success: true,
        message: 'Forecasts retrieved successfully',
        data: forecasts,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: forecasts.length
        }
      });
    } catch (error) {
      logger.error('Failed to get forecasts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get forecasts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get Forecast Accuracy
router.get('/accuracy',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST', 'VIEWER']),
  [
    query('framework').optional().isString(),
    query('timeframe').optional().isIn(['7d', '30d', '90d', '1y'])
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, timeframe = '30d' } = req.query;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      // In a real implementation, this would calculate accuracy from historical data
      const accuracy = {
        overallAccuracy: 85.2,
        shortTermAccuracy: 92.1,
        mediumTermAccuracy: 78.5,
        longTermAccuracy: 65.3,
        trendAccuracy: 88.7,
        levelAccuracy: 82.1,
        historicalPerformance: []
      };

      res.json({
        success: true,
        message: 'Forecast accuracy retrieved successfully',
        data: accuracy
      });
    } catch (error) {
      logger.error('Failed to get forecast accuracy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get forecast accuracy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Generate Forecast Report
router.post('/:forecastId/report',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    param('forecastId').isUUID().withMessage('Valid forecast ID is required'),
    body('format').optional().isIn(['PDF', 'EXCEL', 'CSV']).withMessage('Invalid report format')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { forecastId } = req.params;
      const { format = 'PDF' } = req.body;

      // In a real implementation, this would generate the actual report
      const reportBuffer = Buffer.from('Mock report content');

      const contentType = format === 'PDF' ? 'application/pdf' : 
                         format === 'EXCEL' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                         'text/csv';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=forecast-report-${forecastId}.${format.toLowerCase()}`);
      res.send(reportBuffer);
    } catch (error) {
      logger.error('Failed to generate forecast report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate forecast report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Validate Forecast Model
router.post('/:forecastId/validate',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    param('forecastId').isUUID().withMessage('Valid forecast ID is required'),
    body('method').optional().isIn(['CROSS_VALIDATION', 'HOLDOUT', 'BOOTSTRAP']).withMessage('Invalid validation method')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { forecastId } = req.params;
      const { method = 'CROSS_VALIDATION' } = req.body;

      // In a real implementation, this would perform model validation
      const validation = {
        method,
        accuracy: 85.2,
        rmse: 2.1,
        mae: 1.8,
        mape: 5.2,
        r2: 0.85,
        validationPeriods: 5,
        averageError: 1.9,
        maxError: 4.2,
        minError: 0.3
      };

      res.json({
        success: true,
        message: 'Model validation completed successfully',
        data: validation
      });
    } catch (error) {
      logger.error('Failed to validate forecast model:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate forecast model',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Historical Compliance Analysis
router.post('/analysis/historical',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    body('framework').isString().notEmpty().withMessage('Framework is required'),
    body('timeRange.start').isISO8601().withMessage('Valid start date is required'),
    body('timeRange.end').isISO8601().withMessage('Valid end date is required'),
    body('metrics').optional().isArray().withMessage('Metrics must be an array')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework, timeRange, metrics } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const analysis = await complianceDataAnalysisService.performHistoricalAnalysis(
        companyId,
        framework,
        {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end)
        },
        metrics
      );

      res.json({
        success: true,
        message: 'Historical analysis completed successfully',
        data: analysis
      });
    } catch (error) {
      logger.error('Failed to perform historical analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform historical analysis',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Calculate Compliance Risk Score
router.post('/risk-score',
  requireRole(['ADMIN', 'COMPLIANCE_MANAGER', 'ANALYST']),
  [
    body('framework').isString().notEmpty().withMessage('Framework is required')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { framework } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
      }

      const riskScore = await complianceDataAnalysisService.calculateComplianceRiskScore(
        companyId,
        framework
      );

      res.json({
        success: true,
        message: 'Compliance risk score calculated successfully',
        data: riskScore
      });
    } catch (error) {
      logger.error('Failed to calculate compliance risk score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate compliance risk score',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
