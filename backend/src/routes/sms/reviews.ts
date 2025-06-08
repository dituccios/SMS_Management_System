import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all reviews
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = {
    document: { companyId },
  };

  if (req.query.status) where.status = req.query.status;
  if (req.query.priority) where.priority = req.query.priority;

  const [reviews, total] = await Promise.all([
    prisma.sMSReview.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
        reviewer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSReview.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      reviews,
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

// Create review
router.post('/', [
  requireUser,
  body('documentId').isUUID(),
  body('reviewerId').isUUID(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('dueDate').optional().isISO8601(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { documentId, reviewerId, priority, dueDate } = req.body;
  const companyId = req.user!.companyId!;

  // Verify document belongs to company
  const document = await prisma.sMSDocument.findFirst({
    where: { id: documentId, companyId },
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found',
    });
  }

  const review = await prisma.sMSReview.create({
    data: {
      documentId,
      reviewerId,
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      document: {
        select: {
          title: true,
        },
      },
      reviewer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: { review },
  });
}));

export default router;
