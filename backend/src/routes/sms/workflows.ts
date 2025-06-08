import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest, requireUser } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// Get all workflows
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('isActive').optional().isBoolean(),
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
  const category = req.query.category as string;
  const isActive = req.query.isActive;
  const skip = (page - 1) * limit;

  const where: any = { companyId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [workflows, total] = await Promise.all([
    prisma.sMSWorkflow.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            instances: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sMSWorkflow.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      workflows,
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

// Get workflow by ID
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

  const workflow = await prisma.sMSWorkflow.findFirst({
    where: { id, companyId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      instances: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!workflow) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found',
    });
  }

  res.json({
    success: true,
    data: { workflow },
  });
}));

// Create workflow
router.post('/', [
  requireUser,
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('category').trim().isLength({ min: 1 }),
  body('steps').isArray({ min: 1 }),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { name, description, category, steps } = req.body;
  const companyId = req.user!.companyId!;
  const createdById = req.user!.id;

  const workflow = await prisma.sMSWorkflow.create({
    data: {
      name,
      description,
      category,
      steps,
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

  logger.info(`Workflow created: ${workflow.name} by ${req.user!.email}`);

  res.status(201).json({
    success: true,
    message: 'Workflow created successfully',
    data: { workflow },
  });
}));

// Update workflow
router.put('/:id', [
  requireUser,
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('category').optional().trim().isLength({ min: 1 }),
  body('steps').optional().isArray({ min: 1 }),
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
  const companyId = req.user!.companyId!;

  const existingWorkflow = await prisma.sMSWorkflow.findFirst({
    where: { id, companyId },
  });

  if (!existingWorkflow) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found',
    });
  }

  const { name, description, category, steps, isActive } = req.body;

  const workflow = await prisma.sMSWorkflow.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(category && { category }),
      ...(steps && { steps }),
      ...(typeof isActive === 'boolean' && { isActive }),
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

  logger.info(`Workflow updated: ${workflow.name} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Workflow updated successfully',
    data: { workflow },
  });
}));

// Delete workflow
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

  const existingWorkflow = await prisma.sMSWorkflow.findFirst({
    where: { id, companyId },
  });

  if (!existingWorkflow) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found',
    });
  }

  // Check if workflow has active instances
  const activeInstances = await prisma.sMSWorkflowInstance.count({
    where: {
      workflowId: id,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  if (activeInstances > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete workflow with active instances',
    });
  }

  await prisma.sMSWorkflow.delete({
    where: { id },
  });

  logger.info(`Workflow deleted: ${existingWorkflow.name} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Workflow deleted successfully',
  });
}));

// Start workflow instance
router.post('/:id/start', [
  requireUser,
  param('id').isUUID(),
  body('documentId').optional().isUUID(),
  body('data').optional().isObject(),
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
  const { documentId, data } = req.body;
  const companyId = req.user!.companyId!;

  const workflow = await prisma.sMSWorkflow.findFirst({
    where: { id, companyId, isActive: true },
  });

  if (!workflow) {
    return res.status(404).json({
      success: false,
      message: 'Active workflow not found',
    });
  }

  const instance = await prisma.sMSWorkflowInstance.create({
    data: {
      workflowId: id,
      documentId,
      data,
    },
    include: {
      workflow: {
        select: {
          name: true,
        },
      },
      document: {
        select: {
          title: true,
        },
      },
    },
  });

  logger.info(`Workflow instance started: ${workflow.name} by ${req.user!.email}`);

  res.status(201).json({
    success: true,
    message: 'Workflow instance started successfully',
    data: { instance },
  });
}));

export default router;
