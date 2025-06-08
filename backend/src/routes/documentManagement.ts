import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import documentService from '../services/documentManagement/documentService';
import documentClassificationService from '../services/documentManagement/documentClassificationService';
import documentStorageService from '../services/documentManagement/documentStorageService';
import documentSearchService from '../services/documentManagement/documentSearchService';
import documentWorkflowService from '../services/documentManagement/documentWorkflowService';
import documentComplianceService from '../services/documentManagement/documentComplianceService';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now - validation happens in service
    cb(null, true);
  }
});

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
 * /api/v1/documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *               - categoryId
 *               - typeId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               typeId:
 *                 type: string
 *               securityLevel:
 *                 type: string
 *                 enum: [PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
router.post('/',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  upload.single('file'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('categoryId').notEmpty().withMessage('Category ID is required'),
    body('typeId').notEmpty().withMessage('Type ID is required'),
    body('securityLevel').optional().isIn(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
    body('tags').optional().isArray()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'File is required'
          }
        });
      }

      const { title, description, categoryId, typeId, securityLevel, tags } = req.body;
      const { userId, companyId } = req.user as any;

      const upload = {
        file: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        metadata: {
          title,
          description,
          categoryId,
          typeId,
          securityLevel,
          tags: tags ? JSON.parse(tags) : []
        },
        uploadedBy: userId,
        companyId
      };

      const document = await documentService.uploadDocument(upload);

      res.status(201).json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Failed to upload document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload document'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/search:
 *   get:
 *     summary: Search documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: typeId
 *         schema:
 *           type: string
 *         description: Filter by document type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    query('q').optional().isString(),
    query('categoryId').optional().isString(),
    query('typeId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { q, categoryId, typeId, limit = 50, offset = 0 } = req.query;
      const { companyId } = req.user as any;

      const searchQuery = {
        query: q as string || '',
        companyId,
        filters: {
          categoryIds: categoryId ? [categoryId as string] : undefined,
          typeIds: typeId ? [typeId as string] : undefined
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      };

      const results = await documentSearchService.search(searchQuery);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Failed to search documents:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search documents'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document details
 */
router.get('/:id',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.user as any;

      const document = await documentService.getDocument(id, userId);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Failed to get document:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'DOCUMENT_NOT_FOUND' : 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get document'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{id}/download:
 *   get:
 *     summary: Download document file
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document file
 */
router.get('/:id/download',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { userId, companyId } = req.user as any;

      // Get document metadata
      const document = await documentService.getDocument(id, userId);
      
      // Retrieve file from storage
      const fileData = await documentStorageService.retrieveFile(
        document.fileName,
        companyId,
        {
          fileName: document.fileName,
          originalFileName: document.originalFileName,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          checksum: document.checksum,
          isEncrypted: false, // This would come from metadata
          isCompressed: false // This would come from metadata
        }
      );

      // Set appropriate headers
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
      res.setHeader('Content-Length', fileData.length);

      res.send(fileData);
    } catch (error) {
      logger.error('Failed to download document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download document'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/categories:
 *   get:
 *     summary: Get document categories
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of document categories
 */
router.get('/categories',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;

      const categories = await documentClassificationService.getCategories(companyId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Failed to get categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get categories'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/types:
 *   get:
 *     summary: Get document types
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of document types
 */
router.get('/types',
  authenticateToken,
  requireRole(['ADMIN', 'USER']),
  async (req: express.Request, res: express.Response) => {
    try {
      const { companyId } = req.user as any;

      const types = await documentClassificationService.getDocumentTypes(companyId);

      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      logger.error('Failed to get document types:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get document types'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/{id}/approve:
 *   post:
 *     summary: Approve document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document approved successfully
 */
router.post('/:id/approve',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  [
    param('id').isString().notEmpty(),
    body('comments').optional().isString()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const { userId } = req.user as any;

      await documentWorkflowService.transitionWorkflow(id, 'approve', userId, { comments });

      res.json({
        success: true,
        message: 'Document approved successfully'
      });
    } catch (error) {
      logger.error('Failed to approve document:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVAL_FAILED',
          message: 'Failed to approve document'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/documents/compliance/report:
 *   get:
 *     summary: Get compliance report
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *     responses:
 *       200:
 *         description: Compliance report
 */
router.get('/compliance/report',
  authenticateToken,
  requireRole(['ADMIN']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { startDate, endDate } = req.query;
      const { companyId } = req.user as any;

      const dateRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      const report = await documentComplianceService.generateComplianceReport(companyId, dateRange);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REPORT_FAILED',
          message: 'Failed to generate compliance report'
        }
      });
    }
  }
);

export default router;
