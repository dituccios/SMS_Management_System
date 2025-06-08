import express from 'express';
import { query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get audit logs
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('entity').optional().trim(),
  query('action').optional().trim(),
  query('userId').optional().isUUID(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (req.query.entity) where.entity = req.query.entity;
  if (req.query.action) where.action = { contains: req.query.action, mode: 'insensitive' };
  if (req.query.userId) where.userId = req.query.userId;

  const [auditLogs, total] = await Promise.all([
    prisma.sMSAuditLog.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSAuditLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      auditLogs,
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

export default router;
