import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth';
import auditLoggingService from '../services/audit/auditLoggingService';
import elasticsearchService from '../services/audit/elasticsearchService';
import auditAlertService from '../services/audit/auditAlertService';
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
 * /api/v1/audit/events:
 *   get:
 *     summary: Search audit events
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for search
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for search
 *       - in: query
 *         name: eventTypes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by event types
 *       - in: query
 *         name: categories
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by categories
 *       - in: query
 *         name: severities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by severities
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Text search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Audit events search results
 */
router.get('/events',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('eventTypes').optional().isArray(),
    query('categories').optional().isArray(),
    query('severities').optional().isArray(),
    query('userId').optional().isString(),
    query('resourceType').optional().isString(),
    query('searchQuery').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const {
        startDate,
        endDate,
        eventTypes,
        categories,
        severities,
        userId,
        resourceType,
        searchQuery,
        limit = 100,
        offset = 0
      } = req.query;

      const { companyId, role } = req.user as any;

      const searchCriteria: any = {
        companyId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      // Apply filters
      if (startDate && endDate) {
        searchCriteria.dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      if (eventTypes) searchCriteria.eventTypes = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
      if (categories) searchCriteria.categories = Array.isArray(categories) ? categories : [categories];
      if (severities) searchCriteria.severities = Array.isArray(severities) ? severities : [severities];
      if (userId) searchCriteria.userId = userId;
      if (resourceType) searchCriteria.resourceTypes = [resourceType];
      if (searchQuery) searchCriteria.searchQuery = searchQuery;

      // Non-admin users can only see their own events
      if (role !== 'ADMIN' && role !== 'AUDITOR') {
        searchCriteria.userId = (req.user as any).userId;
      }

      const results = await auditLoggingService.searchEvents(searchCriteria);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Failed to search audit events:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search audit events'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/events/{eventId}:
 *   get:
 *     summary: Get audit event by ID
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Audit event details
 */
router.get('/events/:eventId',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    param('eventId').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { eventId } = req.params;

      const event = await elasticsearchService.getAuditEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Audit event not found'
          }
        });
      }

      // Verify integrity
      const isValid = await auditLoggingService.verifyEventIntegrity(eventId);

      res.json({
        success: true,
        data: {
          ...event,
          integrityVerified: isValid
        }
      });
    } catch (error) {
      logger.error('Failed to get audit event:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get audit event'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/events/{eventId}/verify:
 *   post:
 *     summary: Verify audit event integrity
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Integrity verification result
 */
router.post('/events/:eventId/verify',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    param('eventId').isString().notEmpty()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { eventId } = req.params;

      const isValid = await auditLoggingService.verifyEventIntegrity(eventId);

      res.json({
        success: true,
        data: {
          eventId,
          integrityVerified: isValid,
          verifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to verify event integrity:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Failed to verify event integrity'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/analytics:
 *   get:
 *     summary: Get audit analytics
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for analytics
 *     responses:
 *       200:
 *         description: Audit analytics data
 */
router.get('/analytics',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { startDate, endDate } = req.query;
      const { companyId } = req.user as any;

      const dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const analytics = await elasticsearchService.getAuditAnalytics(companyId, dateRange);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get audit analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_FAILED',
          message: 'Failed to get audit analytics'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/export:
 *   post:
 *     summary: Export audit events
 *     tags: [Audit Trail]
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
 *               - startDate
 *               - endDate
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [JSON, CSV, PDF]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Exported audit data
 */
router.post('/export',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    body('format').isIn(['JSON', 'CSV', 'PDF']),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('filters').optional().isObject()
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { format, startDate, endDate, filters = {} } = req.body;
      const { companyId } = req.user as any;

      const searchCriteria = {
        companyId,
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate)
        },
        ...filters,
        limit: 10000 // Large limit for export
      };

      const results = await auditLoggingService.searchEvents(searchCriteria);

      switch (format) {
        case 'JSON':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="audit-export.json"');
          res.json(results);
          break;

        case 'CSV':
          const csv = await this.convertToCSV(results.events);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
          res.send(csv);
          break;

        case 'PDF':
          const pdf = await this.convertToPDF(results.events);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="audit-export.pdf"');
          res.send(pdf);
          break;

        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      logger.error('Failed to export audit events:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export audit events'
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/audit/alerts:
 *   get:
 *     summary: Get audit alerts
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, ACKNOWLEDGED, INVESTIGATING, RESOLVED, CLOSED]
 *         description: Filter by alert status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by severity
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Audit alerts
 */
router.get('/alerts',
  authenticateToken,
  requireRole(['ADMIN', 'AUDITOR']),
  [
    query('status').optional().isIn(['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED']),
    query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { status, severity, limit = 50 } = req.query;
      const { companyId } = req.user as any;

      // This would query the audit alerts from the database
      // For now, return empty array
      const alerts: any[] = [];

      res.json({
        success: true,
        data: {
          alerts,
          total: alerts.length
        }
      });
    } catch (error) {
      logger.error('Failed to get audit alerts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_FAILED',
          message: 'Failed to get audit alerts'
        }
      });
    }
  }
);

// Helper methods for export functionality
async function convertToCSV(events: any[]): Promise<string> {
  if (events.length === 0) return '';

  const headers = [
    'Event ID', 'Timestamp', 'Event Type', 'Category', 'Severity',
    'Action', 'Description', 'User ID', 'User Email', 'IP Address',
    'Resource Type', 'Resource ID', 'Outcome'
  ];

  const rows = events.map(event => [
    event.eventId,
    event.timestamp,
    event.eventType,
    event.category,
    event.severity,
    event.action,
    event.description,
    event.userId || '',
    event.userEmail || '',
    event.ipAddress || '',
    event.resourceType || '',
    event.resourceId || '',
    event.outcome
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

async function convertToPDF(events: any[]): Promise<Buffer> {
  // This would use a PDF generation library like PDFKit
  // For now, return empty buffer
  return Buffer.from('PDF content would be generated here');
}

export default router;
