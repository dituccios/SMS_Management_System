import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Get all documents
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('status').optional().isIn(['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED', 'EXPIRED']),
  query('category').optional().isIn(['POLICY', 'PROCEDURE', 'WORK_INSTRUCTION', 'FORM', 'RECORD', 'MANUAL', 'CERTIFICATE', 'OTHER']),
  query('type').optional().isIn(['SAFETY_POLICY', 'EMERGENCY_PROCEDURE', 'TRAINING_MATERIAL', 'INCIDENT_REPORT', 'AUDIT_REPORT', 'RISK_ASSESSMENT', 'COMPLIANCE_DOCUMENT', 'OTHER']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const companyId = req.user!.companyId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const status = req.query.status as string;
  const category = req.query.category as string;
  const type = req.query.type as string;
  const skip = (page - 1) * limit;

  const where: any = { companyId };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) where.status = status;
  if (category) where.category = category;
  if (type) where.type = type;

  const [documents, total] = await Promise.all([
    prisma.sMSDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        version: true,
        status: true,
        category: true,
        type: true,
        expiresAt: true,
        reviewDate: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            versions: true,
            reviews: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSDocument.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get document by ID
router.get('/:id', [
  param('id').isUUID(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const companyId = req.user!.companyId!;

  const document = await prisma.sMSDocument.findFirst({
    where: { id, companyId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      reviews: {
        include: {
          reviewer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          comments: {
            include: {
              author: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  res.json({
    success: true,
    data: { document },
  });
}));

// Create document
router.post('/', [
  requireUser,
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('content').optional().trim(),
  body('category').isIn(['POLICY', 'PROCEDURE', 'WORK_INSTRUCTION', 'FORM', 'RECORD', 'MANUAL', 'CERTIFICATE', 'OTHER']),
  body('type').isIn(['SAFETY_POLICY', 'EMERGENCY_PROCEDURE', 'TRAINING_MATERIAL', 'INCIDENT_REPORT', 'AUDIT_REPORT', 'RISK_ASSESSMENT', 'COMPLIANCE_DOCUMENT', 'OTHER']),
  body('tags').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  body('reviewDate').optional().isISO8601(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const {
    title,
    description,
    content,
    category,
    type,
    tags,
    expiresAt,
    reviewDate,
  } = req.body;

  const companyId = req.user!.companyId!;
  const authorId = req.user!.id;

  const document = await prisma.sMSDocument.create({
    data: {
      title,
      description,
      content,
      category,
      type,
      tags: tags || [],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      companyId,
      authorId,
    },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  logger.info(`Document created: ${document.title} by ${req.user!.email}`);

  res.status(201).json({
    success: true,
    message: 'Document created successfully',
    data: { document },
  });
}));

// Update document
router.put('/:id', [
  requireUser,
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('content').optional().trim(),
  body('category').optional().isIn(['POLICY', 'PROCEDURE', 'WORK_INSTRUCTION', 'FORM', 'RECORD', 'MANUAL', 'CERTIFICATE', 'OTHER']),
  body('type').optional().isIn(['SAFETY_POLICY', 'EMERGENCY_PROCEDURE', 'TRAINING_MATERIAL', 'INCIDENT_REPORT', 'AUDIT_REPORT', 'RISK_ASSESSMENT', 'COMPLIANCE_DOCUMENT', 'OTHER']),
  body('tags').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  body('reviewDate').optional().isISO8601(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const companyId = req.user!.companyId!;

  // Check if document exists and belongs to company
  const existingDocument = await prisma.sMSDocument.findFirst({
    where: { id, companyId },
  });

  if (!existingDocument) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  const {
    title,
    description,
    content,
    category,
    type,
    tags,
    expiresAt,
    reviewDate,
  } = req.body;

  // Create version if content changed
  if (content && content !== existingDocument.content) {
    await prisma.sMSDocumentVersion.create({
      data: {
        documentId: id,
        version: existingDocument.version,
        content: existingDocument.content,
        changeLog: 'Updated content',
      },
    });
  }

  const document = await prisma.sMSDocument.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(content && { content, version: `${parseFloat(existingDocument.version) + 0.1}` }),
      ...(category && { category }),
      ...(type && { type }),
      ...(tags && { tags }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(reviewDate !== undefined && { reviewDate: reviewDate ? new Date(reviewDate) : null }),
    },
    include: {
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  logger.info(`Document updated: ${document.title} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Document updated successfully',
    data: { document },
  });
}));

// Delete document
router.delete('/:id', [
  requireUser,
  param('id').isUUID(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const companyId = req.user!.companyId!;

  const existingDocument = await prisma.sMSDocument.findFirst({
    where: { id, companyId },
  });

  if (!existingDocument) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  await prisma.sMSDocument.delete({
    where: { id },
  });

  logger.info(`Document deleted: ${existingDocument.title} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Document deleted successfully',
  });
}));

export default router;
