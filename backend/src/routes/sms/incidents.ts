import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all incidents
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']),
  query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = { companyId };

  if (req.query.status) where.status = req.query.status;
  if (req.query.severity) where.severity = req.query.severity;

  const [incidents, total] = await Promise.all([
    prisma.sMSIncident.findMany({
      where,
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { reportedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSIncident.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      incidents,
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

// Create incident
router.post('/', [
  requireUser,
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('severity').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('category').trim().isLength({ min: 1 }),
  body('location').optional().trim(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { title, description, severity, category, location } = req.body;
  const companyId = req.user!.companyId!;
  const reporterId = req.user!.id;

  const incident = await prisma.sMSIncident.create({
    data: {
      title,
      description,
      severity,
      category,
      location,
      companyId,
      reporterId,
    },
    include: {
      reporter: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Incident created successfully',
    data: { incident },
  });
}));

export default router;
