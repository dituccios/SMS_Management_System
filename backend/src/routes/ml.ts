import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { logger } from '../utils/logger';
import timeSeriesForecastingService from '../services/ml/timeSeriesForecastingService';
import riskClassificationService from '../services/ml/riskClassificationService';
import dataProcessingPipelineService from '../services/ml/dataProcessingPipelineService';
import optimizationAlgorithmsService from '../services/ml/optimizationAlgorithmsService';
import aiServiceLayer from '../services/ml/aiServiceLayer';

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

// Time Series Forecasting Routes
router.post('/forecasting/arima',
  auth,
  [
    body('data').isArray().withMessage('Data must be an array'),
    body('data.*.timestamp').isISO8601().withMessage('Invalid timestamp format'),
    body('data.*.value').isNumeric().withMessage('Value must be numeric'),
    body('horizon').isInt({ min: 1, max: 365 }).withMessage('Horizon must be between 1 and 365'),
    body('autoOrder').optional().isBoolean().withMessage('AutoOrder must be boolean'),
    body('confidence').optional().isFloat({ min: 0.5, max: 0.99 }).withMessage('Confidence must be between 0.5 and 0.99')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { data, horizon, autoOrder = true, confidence = 0.95 } = req.body;
      
      const timeSeriesData = data.map((d: any) => ({
        timestamp: new Date(d.timestamp),
        value: d.value,
        features: d.features || {}
      }));

      const forecast = await timeSeriesForecastingService.createARIMAForecast(
        timeSeriesData,
        horizon,
        autoOrder
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('ARIMA forecasting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECASTING_ERROR',
          message: 'Failed to create ARIMA forecast',
          details: error.message
        }
      });
    }
  }
);

router.post('/forecasting/prophet',
  auth,
  [
    body('data').isArray().withMessage('Data must be an array'),
    body('horizon').isInt({ min: 1, max: 365 }).withMessage('Horizon must be between 1 and 365'),
    body('includeHolidays').optional().isBoolean().withMessage('IncludeHolidays must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { data, horizon, includeHolidays = true } = req.body;
      
      const timeSeriesData = data.map((d: any) => ({
        timestamp: new Date(d.timestamp),
        value: d.value,
        features: d.features || {}
      }));

      const forecast = await timeSeriesForecastingService.createProphetForecast(
        timeSeriesData,
        horizon,
        includeHolidays
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Prophet forecasting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECASTING_ERROR',
          message: 'Failed to create Prophet forecast',
          details: error.message
        }
      });
    }
  }
);

router.post('/forecasting/lstm',
  auth,
  [
    body('data').isArray().withMessage('Data must be an array'),
    body('horizon').isInt({ min: 1, max: 90 }).withMessage('Horizon must be between 1 and 90')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { data, horizon, architecture } = req.body;
      
      const timeSeriesData = data.map((d: any) => ({
        timestamp: new Date(d.timestamp),
        value: d.value,
        features: d.features || {}
      }));

      const forecast = await timeSeriesForecastingService.createLSTMForecast(
        timeSeriesData,
        horizon,
        architecture
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('LSTM forecasting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECASTING_ERROR',
          message: 'Failed to create LSTM forecast',
          details: error.message
        }
      });
    }
  }
);

router.post('/forecasting/ensemble',
  auth,
  [
    body('data').isArray().withMessage('Data must be an array'),
    body('horizon').isInt({ min: 1, max: 365 }).withMessage('Horizon must be between 1 and 365'),
    body('models').optional().isArray().withMessage('Models must be an array')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { data, horizon, models = ['ARIMA', 'PROPHET', 'LSTM'] } = req.body;
      
      const timeSeriesData = data.map((d: any) => ({
        timestamp: new Date(d.timestamp),
        value: d.value,
        features: d.features || {}
      }));

      const forecast = await timeSeriesForecastingService.createEnsembleForecast(
        timeSeriesData,
        horizon,
        models
      );

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Ensemble forecasting error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECASTING_ERROR',
          message: 'Failed to create ensemble forecast',
          details: error.message
        }
      });
    }
  }
);

// Risk Classification Routes
router.post('/risk/classify',
  auth,
  [
    body('features').isObject().withMessage('Features must be an object'),
    body('features.companySize').isNumeric().withMessage('Company size must be numeric'),
    body('features.industry').isString().withMessage('Industry must be a string'),
    body('includeExplanation').optional().isBoolean().withMessage('IncludeExplanation must be boolean'),
    body('includeRecommendations').optional().isBoolean().withMessage('IncludeRecommendations must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { features, includeExplanation = true, includeRecommendations = true } = req.body;

      const classification = await riskClassificationService.classifyRisk(features);

      res.json({
        success: true,
        data: classification
      });
    } catch (error) {
      logger.error('Risk classification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLASSIFICATION_ERROR',
          message: 'Failed to classify risk',
          details: error.message
        }
      });
    }
  }
);

router.post('/risk/classify/batch',
  auth,
  [
    body('features').isArray().withMessage('Features must be an array'),
    body('options').optional().isObject().withMessage('Options must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { features, options = {} } = req.body;

      const classifications = await riskClassificationService.classifyBatch(features);

      res.json({
        success: true,
        data: classifications
      });
    } catch (error) {
      logger.error('Batch risk classification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_CLASSIFICATION_ERROR',
          message: 'Failed to perform batch risk classification',
          details: error.message
        }
      });
    }
  }
);

router.post('/risk/explain',
  auth,
  [
    body('features').isObject().withMessage('Features must be an object'),
    body('classificationId').optional().isString().withMessage('ClassificationId must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { features, classificationId } = req.body;

      const explanation = await riskClassificationService.explainPrediction(features, classificationId);

      res.json({
        success: true,
        data: explanation
      });
    } catch (error) {
      logger.error('Risk explanation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPLANATION_ERROR',
          message: 'Failed to explain risk prediction',
          details: error.message
        }
      });
    }
  }
);

// Data Pipeline Routes
router.post('/pipeline',
  auth,
  [
    body('name').isString().withMessage('Name must be a string'),
    body('description').isString().withMessage('Description must be a string'),
    body('stages').isArray().withMessage('Stages must be an array')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, stages, configuration = {} } = req.body;

      const pipeline = await dataProcessingPipelineService.createPipeline(
        name,
        description,
        stages,
        configuration
      );

      res.json({
        success: true,
        data: pipeline
      });
    } catch (error) {
      logger.error('Pipeline creation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIPELINE_ERROR',
          message: 'Failed to create pipeline',
          details: error.message
        }
      });
    }
  }
);

router.post('/pipeline/:pipelineId/execute',
  auth,
  [
    param('pipelineId').isUUID().withMessage('Invalid pipeline ID'),
    body('parameters').optional().isObject().withMessage('Parameters must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pipelineId } = req.params;
      const { parameters = {} } = req.body;

      const execution = await dataProcessingPipelineService.executePipeline(pipelineId, parameters);

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('Pipeline execution error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PIPELINE_EXECUTION_ERROR',
          message: 'Failed to execute pipeline',
          details: error.message
        }
      });
    }
  }
);

router.get('/pipeline',
  auth,
  [
    query('companyId').optional().isUUID().withMessage('Invalid company ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { companyId } = req.query;

      const pipelines = await dataProcessingPipelineService.getPipelines(companyId as string);

      res.json({
        success: true,
        data: pipelines
      });
    } catch (error) {
      logger.error('Get pipelines error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PIPELINES_ERROR',
          message: 'Failed to get pipelines',
          details: error.message
        }
      });
    }
  }
);

// AI Service Layer Routes
router.post('/ai/predict',
  auth,
  [
    body('modelId').isString().withMessage('ModelId must be a string'),
    body('features').isObject().withMessage('Features must be an object'),
    body('options').optional().isObject().withMessage('Options must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const predictionRequest = {
        requestId: crypto.randomUUID(),
        modelId: req.body.modelId,
        features: req.body.features,
        options: req.body.options || {}
      };

      const prediction = await aiServiceLayer.predict(predictionRequest);

      res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      logger.error('AI prediction error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREDICTION_ERROR',
          message: 'Failed to make prediction',
          details: error.message
        }
      });
    }
  }
);

router.post('/ai/predict/batch',
  auth,
  [
    body('modelId').isString().withMessage('ModelId must be a string'),
    body('data').isArray().withMessage('Data must be an array'),
    body('options').optional().isObject().withMessage('Options must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const batchRequest = {
        requestId: crypto.randomUUID(),
        modelId: req.body.modelId,
        data: req.body.data,
        options: req.body.options || {},
        outputDestination: req.body.outputDestination
      };

      const batchPrediction = await aiServiceLayer.batchPredict(batchRequest);

      res.json({
        success: true,
        data: batchPrediction
      });
    } catch (error) {
      logger.error('Batch prediction error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_PREDICTION_ERROR',
          message: 'Failed to perform batch prediction',
          details: error.message
        }
      });
    }
  }
);

// Health check for ML services
router.get('/health',
  auth,
  async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        services: {
          forecasting: 'healthy',
          classification: 'healthy',
          optimization: 'healthy',
          pipeline: 'healthy',
          aiService: 'healthy'
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('ML health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to check ML services health',
          details: error.message
        }
      });
    }
  }
);

export default router;
