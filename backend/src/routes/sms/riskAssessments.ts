import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all risk assessments
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = { companyId };

  if (req.query.riskLevel) where.riskLevel = req.query.riskLevel;

  const [riskAssessments, total] = await Promise.all([
    prisma.sMSRiskAssessment.findMany({
      where,
      include: {
        assessor: {
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
    prisma.sMSRiskAssessment.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      riskAssessments,
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

// Create risk assessment
router.post('/', [
  requireUser,
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('riskLevel').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  body('probability').isFloat({ min: 0, max: 1 }),
  body('impact').isFloat({ min: 0, max: 1 }),
  body('mitigation').optional().trim(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { title, description, riskLevel, probability, impact, mitigation } = req.body;
  const companyId = req.user!.companyId!;
  const assessorId = req.user!.id;

  const riskAssessment = await prisma.sMSRiskAssessment.create({
    data: {
      title,
      description,
      riskLevel,
      probability,
      impact,
      mitigation,
      companyId,
      assessorId,
    },
    include: {
      assessor: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Risk assessment created successfully',
    data: { riskAssessment },
  });
}));

export default router;
