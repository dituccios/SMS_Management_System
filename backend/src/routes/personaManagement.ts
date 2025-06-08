import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth';
import personaManagementService from '../services/personaManagementService';
import dynamicFieldService from '../services/dynamicFieldService';
import systemConfigurationService from '../services/systemConfigurationService';
import integrationService from '../services/integrationService';
import trainingIntegrationService from '../services/trainingIntegrationService';
import complianceEngine from '../services/complianceEngine';
import trainingAnalyticsService from '../services/trainingAnalyticsService';
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
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * @swagger
 * /api/v1/persona-management/profiles:
 *   get:
 *     summary: Get all persona profiles
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, TERMINATED, ON_LEAVE]
 *         description: Filter by status
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: List of persona profiles
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/profiles', 
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'ON_LEAVE']),
    query('department').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { page = 1, limit = 20, status, department } = req.query;

      const filters = {
        status: status as string,
        department: department as string
      };

      const profiles = await personaManagementService.getPersonaProfiles(
        companyId,
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: profiles
      });
    } catch (error) {
      logger.error('Failed to get persona profiles:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve persona profiles'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles:
 *   post:
 *     summary: Create a new persona profile
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - employmentType
 *               - dataProcessingConsent
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               nationalId:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: [FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERN, CONSULTANT]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               managerId:
 *                 type: string
 *               dataProcessingConsent:
 *                 type: boolean
 *               marketingConsent:
 *                 type: boolean
 *               consentVersion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Persona profile created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/profiles',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('dateOfBirth').optional().isISO8601(),
    body('nationalId').optional().isString(),
    body('employeeId').optional().isString(),
    body('department').optional().isString(),
    body('position').optional().isString(),
    body('employmentType').isIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CONSULTANT']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('managerId').optional().isString(),
    body('dataProcessingConsent').isBoolean().withMessage('Data processing consent is required'),
    body('marketingConsent').optional().isBoolean(),
    body('consentVersion').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId, userId } = req.user as any;
      
      const profile = await personaManagementService.createPersonaProfile(
        req.body,
        companyId,
        userId
      );

      res.status(201).json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Failed to create persona profile:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create persona profile'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}:
 *   get:
 *     summary: Get a specific persona profile
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *       - in: query
 *         name: includeDecrypted
 *         schema:
 *           type: boolean
 *         description: Include decrypted sensitive data (admin only)
 *     responses:
 *       200:
 *         description: Persona profile details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/profiles/:id',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty(),
    query('includeDecrypted').optional().isBoolean()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { includeDecrypted = false } = req.query;
      const { role } = req.user as any;

      // Only admins can access decrypted data
      const canDecrypt = role === 'ADMIN' && includeDecrypted === 'true';

      const profile = await personaManagementService.getPersonaProfile(id, canDecrypt);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Failed to get persona profile:', error);
      
      if (error instanceof Error && error.message === 'PersonaProfile not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Persona profile not found'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve persona profile'
          }
        });
      }
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}:
 *   put:
 *     summary: Update a persona profile
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: [FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERN, CONSULTANT]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED, TERMINATED, ON_LEAVE]
 *     responses:
 *       200:
 *         description: Persona profile updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/profiles/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isString().notEmpty(),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('email').optional().isEmail(),
    body('phoneNumber').optional().isMobilePhone('any'),
    body('department').optional().isString(),
    body('position').optional().isString(),
    body('employmentType').optional().isIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CONSULTANT']),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'ON_LEAVE'])
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.user as any;

      const profile = await personaManagementService.updatePersonaProfile(id, req.body, userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Failed to update persona profile:', error);
      
      if (error instanceof Error && error.message === 'PersonaProfile not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Persona profile not found'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update persona profile'
          }
        });
      }
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}:
 *   delete:
 *     summary: Delete (anonymize) a persona profile
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deletion/anonymization
 *     responses:
 *       200:
 *         description: Persona profile anonymized successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.delete('/profiles/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isString().notEmpty(),
    body('reason').notEmpty().withMessage('Reason for deletion is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const { userId } = req.user as any;

      await personaManagementService.deletePersonaProfile(id, reason, userId);

      res.json({
        success: true,
        message: 'Persona profile has been anonymized successfully'
      });
    } catch (error) {
      logger.error('Failed to delete persona profile:', error);
      
      if (error instanceof Error && error.message === 'PersonaProfile not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Persona profile not found'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete persona profile'
          }
        });
      }
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/compliance/overview:
 *   get:
 *     summary: Get compliance overview
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance overview data
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/compliance/overview',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;

      const overview = await personaManagementService.getComplianceOverview(companyId);

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Failed to get compliance overview:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve compliance overview'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/fields:
 *   get:
 *     summary: Get field definitions
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of field definitions
 */
router.get('/fields',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    query('category').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { category } = req.query;

      const fields = await dynamicFieldService.getFieldDefinitions(
        companyId,
        category as string
      );

      res.json({
        success: true,
        data: fields
      });
    } catch (error) {
      logger.error('Failed to get field definitions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve field definitions'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/fields:
 *   post:
 *     summary: Create field definition
 *     tags: [PersonaManagement]
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
 *               - label
 *               - fieldType
 *               - dataType
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               label:
 *                 type: string
 *               fieldType:
 *                 type: string
 *               dataType:
 *                 type: string
 *               category:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               isEncrypted:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Field definition created successfully
 */
router.post('/fields',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('name').notEmpty().withMessage('Field name is required'),
    body('label').notEmpty().withMessage('Field label is required'),
    body('fieldType').notEmpty().withMessage('Field type is required'),
    body('dataType').notEmpty().withMessage('Data type is required'),
    body('category').notEmpty().withMessage('Category is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId, userId } = req.user as any;

      const fieldData = {
        ...req.body,
        companyId
      };

      const field = await dynamicFieldService.createFieldDefinition(fieldData, userId);

      res.status(201).json({
        success: true,
        data: field
      });
    } catch (error) {
      logger.error('Failed to create field definition:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create field definition'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/forms:
 *   get:
 *     summary: Get form templates
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of form templates
 */
router.get('/forms',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    query('category').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { category } = req.query;

      const forms = await dynamicFieldService.getFormTemplates(
        companyId,
        category as string
      );

      res.json({
        success: true,
        data: forms
      });
    } catch (error) {
      logger.error('Failed to get form templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve form templates'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/forms:
 *   post:
 *     summary: Create form template
 *     tags: [PersonaManagement]
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
 *               - category
 *               - fields
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               fields:
 *                 type: array
 *     responses:
 *       201:
 *         description: Form template created successfully
 */
router.post('/forms',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('name').notEmpty().withMessage('Form name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('fields').isArray().withMessage('Fields must be an array')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId, userId } = req.user as any;

      const formData = {
        ...req.body,
        companyId
      };

      const form = await dynamicFieldService.createFormTemplate(formData, userId);

      res.status(201).json({
        success: true,
        data: form
      });
    } catch (error) {
      logger.error('Failed to create form template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create form template'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}/training:
 *   get:
 *     summary: Get persona training status
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *     responses:
 *       200:
 *         description: Persona training status
 */
router.get('/profiles/:id/training',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;

      const trainingStatus = await trainingIntegrationService.getPersonaTrainingStatus(id);

      res.json({
        success: true,
        data: trainingStatus
      });
    } catch (error) {
      logger.error('Failed to get persona training status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve training status'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}/training:
 *   post:
 *     summary: Assign training to persona
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trainingId
 *             properties:
 *               trainingId:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               dueDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Training assigned successfully
 */
router.post('/profiles/:id/training',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    param('id').isString().notEmpty(),
    body('trainingId').notEmpty().withMessage('Training ID is required'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    body('dueDate').optional().isISO8601(),
    body('reason').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { trainingId, priority = 'MEDIUM', dueDate, reason } = req.body;
      const { userId } = req.user as any;

      const assignment = {
        personaId: id,
        trainingId,
        assignedDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        assignedBy: userId,
        reason
      };

      const trainingRecord = await trainingIntegrationService.assignTrainingToPersona(assignment);

      res.status(201).json({
        success: true,
        data: trainingRecord
      });
    } catch (error) {
      logger.error('Failed to assign training:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to assign training'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}/training/{trainingId}/progress:
 *   put:
 *     summary: Update training progress
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *       - in: path
 *         name: trainingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Training ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               score:
 *                 type: number
 *               timeSpentMinutes:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Training progress updated successfully
 */
router.put('/profiles/:id/training/:trainingId/progress',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty(),
    param('trainingId').isString().notEmpty(),
    body('progress').optional().isFloat({ min: 0, max: 100 }),
    body('score').optional().isFloat({ min: 0 }),
    body('timeSpentMinutes').optional().isFloat({ min: 0 }),
    body('notes').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id, trainingId } = req.params;
      const progressData = req.body;

      const updatedRecord = await trainingIntegrationService.updateTrainingProgress(
        id,
        trainingId,
        progressData
      );

      res.json({
        success: true,
        data: updatedRecord
      });
    } catch (error) {
      logger.error('Failed to update training progress:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update training progress'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/profiles/{id}/compliance:
 *   get:
 *     summary: Get persona compliance status
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona profile ID
 *     responses:
 *       200:
 *         description: Persona compliance status
 */
router.get('/profiles/:id/compliance',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;

      const complianceStatus = await complianceEngine.evaluatePersonaCompliance(id);

      res.json({
        success: true,
        data: complianceStatus
      });
    } catch (error) {
      logger.error('Failed to get compliance status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve compliance status'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/analytics/training:
 *   get:
 *     summary: Get training analytics
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *       - in: query
 *         name: departments
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by departments
 *     responses:
 *       200:
 *         description: Training analytics data
 */
router.get('/analytics/training',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('departments').optional().isArray()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { startDate, endDate, departments } = req.query;

      const filter = {
        companyId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        departments: departments as string[]
      };

      const metrics = await trainingAnalyticsService.getTrainingMetrics(filter);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get training analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve training analytics'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/persona-management/reports/training:
 *   post:
 *     summary: Generate training report
 *     tags: [PersonaManagement]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - format
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [JSON, PDF, EXCEL, CSV]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               includeDetails:
 *                 type: boolean
 *               groupBy:
 *                 type: string
 *                 enum: [DEPARTMENT, POSITION, TRAINING, MONTH]
 *     responses:
 *       200:
 *         description: Training report generated successfully
 */
router.post('/reports/training',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    body('format').isIn(['JSON', 'PDF', 'EXCEL', 'CSV']).withMessage('Invalid format'),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('includeDetails').optional().isBoolean(),
    body('groupBy').optional().isIn(['DEPARTMENT', 'POSITION', 'TRAINING', 'MONTH'])
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;
      const { format, startDate, endDate, includeDetails, groupBy } = req.body;

      const filter = {
        companyId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };

      const options = {
        format,
        includeDetails: includeDetails || false,
        groupBy
      };

      const report = await trainingAnalyticsService.getDetailedReport(filter, options);

      // Set appropriate content type based on format
      switch (format) {
        case 'PDF':
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=training-report.pdf');
          break;
        case 'EXCEL':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=training-report.xlsx');
          break;
        case 'CSV':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=training-report.csv');
          break;
        default:
          res.setHeader('Content-Type', 'application/json');
      }

      if (format === 'JSON') {
        res.json({
          success: true,
          data: report
        });
      } else {
        res.send(report);
      }
    } catch (error) {
      logger.error('Failed to generate training report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate training report'
        }
      });
    }
  }
);

export default router;
