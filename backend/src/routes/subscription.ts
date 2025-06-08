import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { PaymentService } from '../services/paymentService';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get current subscription
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  const subscription = await PaymentService.getSubscription(companyId);

  res.json({
    success: true,
    data: { subscription },
  });
}));

// Create subscription (start trial)
router.post('/', [
  body('planId').isString().notEmpty(),
  body('paymentMethodId').optional().isString(),
  body('trialDays').optional().isInt({ min: 1, max: 30 }),
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
  const { planId, paymentMethodId, trialDays = 7 } = req.body;

  // Check if company already has a subscription
  const existingSubscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (existingSubscription) {
    return res.status(409).json({
      success: false,
      message: 'Company already has an active subscription',
    });
  }

  const subscription = await PaymentService.createSubscription({
    companyId,
    planId,
    paymentMethodId,
    trialDays,
  });

  logger.info(`Subscription created for company ${companyId} by ${req.user!.email}`);

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully',
    data: { subscription },
  });
}));

// Update subscription
router.put('/', [
  body('planId').optional().isString(),
  body('cancelAtPeriodEnd').optional().isBoolean(),
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
  const { planId, cancelAtPeriodEnd } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
    });
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      ...(planId && { planId }),
      ...(typeof cancelAtPeriodEnd === 'boolean' && { cancelAtPeriodEnd }),
    },
  });

  res.json({
    success: true,
    message: 'Subscription updated successfully',
    data: { subscription: updatedSubscription },
  });
}));

// Cancel subscription
router.delete('/', [
  body('immediate').optional().isBoolean(),
  body('reason').optional().isString(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const { immediate = false, reason } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
    });
  }

  await PaymentService.cancelSubscription(subscription.id, immediate);

  logger.info(`Subscription canceled for company ${companyId} by ${req.user!.email}. Reason: ${reason || 'Not provided'}`);

  res.json({
    success: true,
    message: 'Subscription canceled successfully',
  });
}));

// Get payment methods
router.get('/payment-methods', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: { paymentMethods },
  });
}));

// Add payment method
router.post('/payment-methods', [
  body('type').isIn(['card', 'paypal', 'sepa_debit']),
  body('card').optional().isObject(),
  body('billing_details').isObject(),
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
  const paymentData = req.body;

  const paymentMethod = await PaymentService.createPaymentMethod(companyId, paymentData);

  res.status(201).json({
    success: true,
    message: 'Payment method added successfully',
    data: { paymentMethod },
  });
}));

// Delete payment method
router.delete('/payment-methods/:id', [
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

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { id, companyId },
  });

  if (!paymentMethod) {
    return res.status(404).json({
      success: false,
      message: 'Payment method not found',
    });
  }

  await prisma.paymentMethod.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Payment method deleted successfully',
  });
}));

// Get invoices
router.get('/invoices', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      invoices: {
        include: {
          invoiceItems: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
    });
  }

  res.json({
    success: true,
    data: { invoices: subscription.invoices },
  });
}));

// Get payments
router.get('/payments', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
    });
  }

  res.json({
    success: true,
    data: { payments: subscription.payments },
  });
}));

// Request refund
router.post('/refunds', [
  body('paymentId').isUUID(),
  body('amount').optional().isFloat({ min: 0 }),
  body('reason').isString().notEmpty(),
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { paymentId, amount, reason } = req.body;
  const companyId = req.user!.companyId!;

  // Verify payment belongs to company
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      subscription: { companyId },
    },
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found',
    });
  }

  // Check if refund is within 14-day EU consumer rights period
  const paymentDate = new Date(payment.createdAt);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  if (paymentDate < fourteenDaysAgo) {
    return res.status(400).json({
      success: false,
      message: 'Refund request is outside the 14-day consumer rights period',
    });
  }

  const refund = await PaymentService.processRefund(paymentId, amount, reason);

  logger.info(`Refund processed for payment ${paymentId} by ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Refund processed successfully',
    data: { refund },
  });
}));

// Get usage statistics
router.get('/usage', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      usageRecords: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
    },
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
    });
  }

  // Calculate current usage
  const currentUsage = {
    users: subscription.userCount,
    storageGB: Number(subscription.storageUsed) / (1024 * 1024 * 1024),
    documents: await prisma.sMSDocument.count({
      where: { companyId },
    }),
    workflows: await prisma.sMSWorkflow.count({
      where: { companyId },
    }),
  };

  res.json({
    success: true,
    data: {
      subscription,
      currentUsage,
      usageHistory: subscription.usageRecords,
    },
  });
}));

export default router;
