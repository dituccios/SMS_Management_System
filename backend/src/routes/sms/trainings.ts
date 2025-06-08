import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all trainings
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
  query('category').optional().trim(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = { companyId };

  if (req.query.status) where.status = req.query.status;
  if (req.query.category) where.category = req.query.category;

  const [trainings, total] = await Promise.all([
    prisma.sMSTraining.findMany({
      where,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSTraining.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      trainings,
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

// Create training
router.post('/', [
  requireUser,
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('category').trim().isLength({ min: 1 }),
  body('duration').optional().isInt({ min: 1 }),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { title, description, category, duration } = req.body;
  const companyId = req.user!.companyId!;
  const createdById = req.user!.id;

  const training = await prisma.sMSTraining.create({
    data: {
      title,
      description,
      category,
      duration,
      companyId,
      createdById,
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Training created successfully',
    data: { training },
  });
}));

export default router;
