import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
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

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company,
      },
    },
  });
}));

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('companyName').optional().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { email, password, firstName, lastName, companyName } = req.body;

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

  // Create user and company in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let company = null;
    
    if (companyName) {
      company = await tx.company.create({
        data: {
          name: companyName,
          industry: 'Other',
          country: 'Unknown',
        },
      });
    }

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: company ? 'OWNER' : 'USER',
        companyId: company?.id,
      },
      include: {
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

    return user;
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: result.id },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  logger.info(`New user registered: ${result.email}`);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      token,
      user: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        company: result.company,
      },
    },
  });
}));

// Get current user profile
router.get('/profile', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
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

  res.json({
    success: true,
    data: { user },
  });
}));

// Logout (client-side token removal)
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  logger.info(`User logged out: ${req.user!.email}`);
  
  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

export default router;
