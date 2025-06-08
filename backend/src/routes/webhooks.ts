import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { PaymentService } from '../services/paymentService';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// PayPal webhook endpoint
router.post('/paypal', express.json(), async (req, res) => {
  try {
    const event = req.body;
    
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePayPalPaymentCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePayPalPaymentFailed(event);
        break;

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handlePayPalSubscriptionActivated(event);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handlePayPalSubscriptionCancelled(event);
        break;

      default:
        logger.info(`Unhandled PayPal event type: ${event.event_type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing PayPal webhook:', error);
    res.status(500).json({ error: 'PayPal webhook processing failed' });
  }
});

// Stripe event handlers
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);
  
  await PaymentService.handlePaymentSuccess(paymentIntent.id);
  
  // Send confirmation email
  // await EmailService.sendPaymentConfirmation(paymentIntent);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment failed: ${paymentIntent.id}`);
  
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: paymentIntent.last_payment_error?.message,
      },
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info(`Invoice payment succeeded: ${invoice.id}`);
  
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (subscription) {
    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'SUCCEEDED',
        paymentMethod: 'CREDIT_CARD',
        stripePaymentId: invoice.payment_intent as string,
        description: `Invoice ${invoice.number}`,
        subscriptionId: subscription.id,
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.info(`Invoice payment failed: ${invoice.id}`);
  
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'PAST_DUE' },
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info(`Subscription updated: ${subscription.id}`);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info(`Subscription deleted: ${subscription.id}`);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  logger.info(`Trial will end: ${subscription.id}`);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { company: { include: { users: true } } },
  });

  if (dbSubscription) {
    // Send trial ending notification
    // await EmailService.sendTrialEndingNotification(dbSubscription);
  }
}

// PayPal event handlers
async function handlePayPalPaymentCompleted(event: any) {
  logger.info(`PayPal payment completed: ${event.resource.id}`);
  
  const payment = await prisma.payment.findFirst({
    where: { paypalPaymentId: event.resource.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED' },
    });
  }
}

async function handlePayPalPaymentFailed(event: any) {
  logger.info(`PayPal payment failed: ${event.resource.id}`);
  
  const payment = await prisma.payment.findFirst({
    where: { paypalPaymentId: event.resource.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: 'PayPal payment denied',
      },
    });
  }
}

async function handlePayPalSubscriptionActivated(event: any) {
  logger.info(`PayPal subscription activated: ${event.resource.id}`);
  
  const subscription = await prisma.subscription.findFirst({
    where: { paypalSubscriptionId: event.resource.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });
  }
}

async function handlePayPalSubscriptionCancelled(event: any) {
  logger.info(`PayPal subscription cancelled: ${event.resource.id}`);
  
  const subscription = await prisma.subscription.findFirst({
    where: { paypalSubscriptionId: event.resource.id },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }
}

export default router;
