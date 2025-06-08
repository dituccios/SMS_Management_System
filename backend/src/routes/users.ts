import express from 'express';
import bcrypt from 'bcryptjs';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest, requireAdmin, requireSameCompany } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get('/', [
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('role').optional().isIn(['OWNER', 'ADMIN', 'USER', 'VIEWER']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const skip = (page - 1) * limit;

  const where: any = {
    companyId: req.user!.companyId,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
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

// Get user by ID
router.get('/:id', [
  requireAdmin,
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

  const user = await prisma.user.findFirst({
    where: {
      id,
      companyId: req.user!.companyId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          country: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    data: { user },
  });
}));

// Create user (Admin only)
router.post('/', [
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['ADMIN', 'USER', 'VIEWER']),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password, firstName, lastName, role } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists with this email',
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      companyId: req.user!.companyId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  logger.info(`User created: ${user.email} by ${req.user!.email}`);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user },
  });
}));

// Update user
router.put('/:id', [
  requireAdmin,
  param('id').isUUID(),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['ADMIN', 'USER', 'VIEWER']),
  body('isActive').optional().isBoolean(),
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
  const { firstName, lastName, role, isActive } = req.body;

  // Check if user exists and belongs to same company
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      companyId: req.user!.companyId,
    },
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Prevent self-deactivation
  if (id === req.user!.id && isActive === false) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate your own account',
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(role && { role }),
      ...(typeof isActive === 'boolean' && { isActive }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  logger.info(`User updated: ${user.email} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
}));

// Delete user (Admin only)
router.delete('/:id', [
  requireAdmin,
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

  // Prevent self-deletion
  if (id === req.user!.id) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account',
    });
  }

  // Check if user exists and belongs to same company
  const existingUser = await prisma.user.findFirst({
    where: {
      id,
      companyId: req.user!.companyId,
    },
  });

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  await prisma.user.delete({
    where: { id },
  });

  logger.info(`User deleted: ${existingUser.email} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
}));

export default router;
