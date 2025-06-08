import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth';
import riskAssessmentFrameworkService from '../services/risk/riskAssessmentFrameworkService';
import riskDataCollectionService from '../services/risk/riskDataCollectionService';
import riskAssessmentEngineService from '../services/risk/riskAssessmentEngineService';
import trainingRecommendationEngineService from '../services/training/trainingRecommendationEngineService';
import userProfilingService from '../services/training/userProfilingService';
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

// ============================================================================
// RISK ASSESSMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/risk/categories:
 *   post:
 *     summary: Create risk category
 *     tags: [Risk Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - weight
 *               - factors
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               weight:
 *                 type: number
 *               parentCategoryId:
 *                 type: string
 *               factors:
 *                 type: array
 *               scoringMethod:
 *                 type: string
 *                 enum: [WEIGHTED_AVERAGE, MAXIMUM, MINIMUM, CUSTOM]
 *               thresholds:
 *                 type: array
 *     responses:
 *       200:
 *         description: Risk category created successfully
 */
router.post('/risk/categories',
  authenticateToken,
  requireRole(['ADMIN', 'RISK_MANAGER']),
  [
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('weight').isNumeric(),
    body('factors').isArray(),
    body('scoringMethod').isIn(['WEIGHTED_AVERAGE', 'MAXIMUM', 'MINIMUM', 'CUSTOM']),
    body('thresholds').isArray()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const categoryData = req.body;
      categoryData.isActive = true;

      const categoryId = await riskAssessmentFrameworkService.createRiskCategory(categoryData);

      res.json({
        success: true,
        data: { categoryId }
      });
    } catch (error) {
      logger.error('Failed to create risk category:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CATEGORY_CREATION_FAILED',
          message: 'Failed to create risk category'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/risk/categories:
 *   get:
 *     summary: Get risk categories
 *     tags: [Risk Assessment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Risk categories retrieved successfully
 */
router.get('/risk/categories',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const categories = await riskAssessmentFrameworkService.getRiskCategories(companyId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Failed to get risk categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CATEGORIES_RETRIEVAL_FAILED',
          message: 'Failed to retrieve risk categories'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/risk/assessments:
 *   post:
 *     summary: Execute risk assessment
 *     tags: [Risk Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assessmentType
 *               - scope
 *               - methodology
 *             properties:
 *               assessmentType:
 *                 type: string
 *                 enum: [COMPREHENSIVE, TARGETED, CONTINUOUS, INCIDENT_TRIGGERED, COMPLIANCE_DRIVEN]
 *               scope:
 *                 type: object
 *               methodology:
 *                 type: object
 *     responses:
 *       200:
 *         description: Risk assessment initiated successfully
 */
router.post('/risk/assessments',
  authenticateToken,
  requireRole(['ADMIN', 'RISK_MANAGER', 'AUDITOR']),
  [
    body('assessmentType').isIn(['COMPREHENSIVE', 'TARGETED', 'CONTINUOUS', 'INCIDENT_TRIGGERED', 'COMPLIANCE_DRIVEN']),
    body('scope').isObject(),
    body('methodology').isObject()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId, userId } = req.user as any;
      const { assessmentType, scope, methodology } = req.body;

      const assessmentId = await riskAssessmentEngineService.executeRiskAssessment(
        companyId,
        assessmentType,
        scope,
        methodology,
        userId
      );

      res.json({
        success: true,
        data: { assessmentId }
      });
    } catch (error) {
      logger.error('Failed to execute risk assessment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSESSMENT_EXECUTION_FAILED',
          message: 'Failed to execute risk assessment'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/risk/data-collectors:
 *   post:
 *     summary: Create risk data collector
 *     tags: [Risk Data Collection]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - configuration
 *               - schedule
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INCIDENT_BASED, EXTERNAL_API, MANUAL_INPUT, CALCULATED, THREAT_INTELLIGENCE]
 *               configuration:
 *                 type: object
 *               schedule:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data collector created successfully
 */
router.post('/risk/data-collectors',
  authenticateToken,
  requireRole(['ADMIN', 'RISK_MANAGER']),
  [
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('type').isIn(['INCIDENT_BASED', 'EXTERNAL_API', 'MANUAL_INPUT', 'CALCULATED', 'THREAT_INTELLIGENCE']),
    body('configuration').isObject(),
    body('schedule').isObject()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const collectorData = req.body;
      collectorData.isActive = true;

      const collectorId = await riskDataCollectionService.createDataCollector(collectorData);

      res.json({
        success: true,
        data: { collectorId }
      });
    } catch (error) {
      logger.error('Failed to create data collector:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'COLLECTOR_CREATION_FAILED',
          message: 'Failed to create data collector'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/risk/data-collectors/{collectorId}/run:
 *   post:
 *     summary: Run risk data collector
 *     tags: [Risk Data Collection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collectorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data collector executed successfully
 */
router.post('/risk/data-collectors/:collectorId/run',
  authenticateToken,
  requireRole(['ADMIN', 'RISK_MANAGER']),
  [
    param('collectorId').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { collectorId } = req.params;

      const result = await riskDataCollectionService.runDataCollector(collectorId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to run data collector:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'COLLECTOR_EXECUTION_FAILED',
          message: 'Failed to run data collector'
        }
      });
    }
  }
);

// ============================================================================
// TRAINING RECOMMENDATION ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/training/recommendations:
 *   get:
 *     summary: Get training recommendations
 *     tags: [Training Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: engineId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Training recommendations retrieved successfully
 */
router.get('/training/recommendations',
  authenticateToken,
  [
    query('engineId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.user as any;
      const { engineId, limit } = req.query;

      const recommendations = await trainingRecommendationEngineService.generateRecommendations(
        userId,
        engineId as string,
        { limit: parseInt(limit as string) || 10 }
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Failed to get training recommendations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATIONS_FAILED',
          message: 'Failed to get training recommendations'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/training/learning-paths:
 *   post:
 *     summary: Generate personalized learning path
 *     tags: [Training Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - objective
 *               - targetSkills
 *             properties:
 *               objective:
 *                 type: string
 *               targetSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *               constraints:
 *                 type: object
 *     responses:
 *       200:
 *         description: Learning path generated successfully
 */
router.post('/training/learning-paths',
  authenticateToken,
  [
    body('objective').isString().notEmpty(),
    body('targetSkills').isArray().notEmpty(),
    body('constraints').optional().isObject()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.user as any;
      const { objective, targetSkills, constraints } = req.body;

      const learningPath = await trainingRecommendationEngineService.generatePersonalizedLearningPath(
        userId,
        objective,
        targetSkills,
        constraints
      );

      res.json({
        success: true,
        data: learningPath
      });
    } catch (error) {
      logger.error('Failed to generate learning path:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LEARNING_PATH_FAILED',
          message: 'Failed to generate learning path'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/training/content:
 *   post:
 *     summary: Add training content
 *     tags: [Training Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - category
 *               - skills
 *               - difficulty
 *               - duration
 *               - format
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [COURSE, MODULE, VIDEO, DOCUMENT, ASSESSMENT, SIMULATION, WEBINAR]
 *               category:
 *                 type: string
 *               skills:
 *                 type: array
 *               difficulty:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *               duration:
 *                 type: number
 *               format:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, BLENDED, SELF_PACED, INSTRUCTOR_LED]
 *     responses:
 *       200:
 *         description: Training content added successfully
 */
router.post('/training/content',
  authenticateToken,
  requireRole(['ADMIN', 'TRAINING_MANAGER', 'CONTENT_CREATOR']),
  [
    body('title').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('type').isIn(['COURSE', 'MODULE', 'VIDEO', 'DOCUMENT', 'ASSESSMENT', 'SIMULATION', 'WEBINAR']),
    body('category').isString().notEmpty(),
    body('skills').isArray(),
    body('difficulty').isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
    body('duration').isNumeric(),
    body('format').isIn(['ONLINE', 'OFFLINE', 'BLENDED', 'SELF_PACED', 'INSTRUCTOR_LED'])
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const contentData = {
        ...req.body,
        subcategory: req.body.subcategory || req.body.category,
        tags: req.body.tags || [],
        language: req.body.language || 'en',
        provider: req.body.provider || 'Internal',
        instructor: req.body.instructor || 'TBD',
        rating: req.body.rating || 0,
        reviewCount: req.body.reviewCount || 0,
        popularity: req.body.popularity || 0,
        recency: new Date(),
        cost: req.body.cost || 0,
        prerequisites: req.body.prerequisites || [],
        learningObjectives: req.body.learningObjectives || [],
        metadata: req.body.metadata || {}
      };

      const contentId = await trainingRecommendationEngineService.addTrainingContent(contentData);

      res.json({
        success: true,
        data: { contentId }
      });
    } catch (error) {
      logger.error('Failed to add training content:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONTENT_ADDITION_FAILED',
          message: 'Failed to add training content'
        }
      });
    }
  }
);

// ============================================================================
// USER PROFILING ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/users/{userId}/skill-gap-analysis:
 *   post:
 *     summary: Perform skill gap analysis
 *     tags: [User Profiling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill gap analysis completed successfully
 */
router.post('/users/:userId/skill-gap-analysis',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER', 'HR']),
  [
    param('userId').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;

      const analysis = await userProfilingService.performSkillGapAnalysis(userId);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Failed to perform skill gap analysis:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SKILL_GAP_ANALYSIS_FAILED',
          message: 'Failed to perform skill gap analysis'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{userId}/learning-history:
 *   get:
 *     summary: Get learning history report
 *     tags: [User Profiling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Learning history report retrieved successfully
 */
router.get('/users/:userId/learning-history',
  authenticateToken,
  [
    param('userId').isString().notEmpty(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const period = {
        start: startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate as string) : new Date()
      };

      const report = await userProfilingService.generateLearningHistoryReport(userId, period);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to get learning history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LEARNING_HISTORY_FAILED',
          message: 'Failed to get learning history'
        }
      });
    }
  }
);

export default router;
