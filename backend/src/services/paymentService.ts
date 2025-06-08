import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface CreateSubscriptionData {
  companyId: string;
  planId: string;
  paymentMethodId: string;
  trialDays?: number;
}

export interface PaymentMethodData {
  type: 'card' | 'paypal' | 'sepa_debit';
  card?: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  billing_details: {
    name: string;
    email: string;
    address?: {
      line1: string;
      city: string;
      country: string;
      postal_code: string;
    };
  };
}

export class PaymentService {
  // Create a new subscription
  static async createSubscription(data: CreateSubscriptionData) {
    try {
      const { companyId, planId, paymentMethodId, trialDays = 7 } = data;

      // Get company details
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { users: true },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: company.users[0]?.email,
        name: company.name,
        metadata: {
          companyId: company.id,
        },
      });

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Calculate trial end date
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        trial_end: Math.floor(trialEnd.getTime() / 1000),
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          companyId: company.id,
        },
      });

      // Create subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          planId,
          status: 'TRIAL',
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          trialStart: new Date(),
          trialEnd,
          amount: 999.00, // €999
          currency: 'EUR',
          interval: 'MONTHLY',
          userCount: company.users.length,
          stripeSubscriptionId: stripeSubscription.id,
          companyId: company.id,
        },
      });

      logger.info(`Subscription created for company ${company.id}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Create payment method
  static async createPaymentMethod(companyId: string, paymentData: PaymentMethodData) {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error('Company not found');
      }

      // Create Stripe payment method
      const stripePaymentMethod = await stripe.paymentMethods.create({
        type: paymentData.type,
        card: paymentData.card,
        billing_details: paymentData.billing_details,
      });

      // Store payment method in database
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          type: paymentData.type.toUpperCase() as any,
          cardLast4: stripePaymentMethod.card?.last4,
          cardBrand: stripePaymentMethod.card?.brand,
          cardExpMonth: stripePaymentMethod.card?.exp_month,
          cardExpYear: stripePaymentMethod.card?.exp_year,
          stripePaymentMethodId: stripePaymentMethod.id,
          companyId: company.id,
        },
      });

      return paymentMethod;
    } catch (error) {
      logger.error('Error creating payment method:', error);
      throw error;
    }
  }

  // Process payment
  static async processPayment(subscriptionId: string, amount: number, description?: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { company: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: subscription.currency.toLowerCase(),
        customer: subscription.stripeSubscriptionId,
        description: description || `Payment for ${subscription.company.name}`,
        metadata: {
          subscriptionId: subscription.id,
          companyId: subscription.companyId,
        },
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          amount,
          currency: subscription.currency,
          status: 'PENDING',
          paymentMethod: 'CREDIT_CARD',
          stripePaymentId: paymentIntent.id,
          description,
          subscriptionId: subscription.id,
        },
      });

      return { payment, clientSecret: paymentIntent.client_secret };
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  // Handle successful payment
  static async handlePaymentSuccess(paymentIntentId: string) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentId: paymentIntentId },
        include: { subscription: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      // Update subscription status if it was a trial
      if (payment.subscription.status === 'TRIAL') {
        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: { status: 'ACTIVE' },
        });
      }

      logger.info(`Payment ${payment.id} processed successfully`);
      return payment;
    } catch (error) {
      logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(subscriptionId: string, immediate = false) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.stripeSubscriptionId) {
        if (immediate) {
          // Cancel immediately
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
          
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
              status: 'CANCELED',
              canceledAt: new Date(),
            },
          });
        } else {
          // Cancel at period end
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });

          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { cancelAtPeriodEnd: true },
          });
        }
      }

      logger.info(`Subscription ${subscriptionId} canceled`);
      return subscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Process refund
  static async processRefund(paymentId: string, amount?: number, reason?: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { subscription: { include: { company: true } } },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const refundAmount = amount || payment.amount;

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId!,
        amount: Math.round(Number(refundAmount) * 100),
        reason: 'requested_by_customer',
        metadata: {
          paymentId: payment.id,
          reason: reason || 'Customer request',
        },
      });

      // Update payment record
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: refundAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundedAmount: refundAmount,
          refundedAt: new Date(),
        },
      });

      // Create refund request record
      await prisma.refundRequest.create({
        data: {
          amount: refundAmount,
          reason: reason || 'Customer request',
          status: 'PROCESSED',
          processedAt: new Date(),
          paymentId: payment.id,
          companyId: payment.subscription.companyId,
        },
      });

      logger.info(`Refund processed for payment ${paymentId}`);
      return stripeRefund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get subscription details
  static async getSubscription(companyId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { companyId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          usageRecords: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Error getting subscription:', error);
      throw error;
    }
  }

  // Update usage metrics
  static async updateUsage(subscriptionId: string, metric: string, quantity: number) {
    try {
      await prisma.usageRecord.create({
        data: {
          metric: metric as any,
          quantity: BigInt(quantity),
          subscriptionId,
        },
      });

      // Update subscription usage counters
      if (metric === 'USERS') {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { userCount: quantity },
        });
      } else if (metric === 'STORAGE_GB') {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { storageUsed: BigInt(quantity * 1024 * 1024 * 1024) }, // Convert GB to bytes
        });
      }

      logger.info(`Usage updated for subscription ${subscriptionId}: ${metric} = ${quantity}`);
    } catch (error) {
      logger.error('Error updating usage:', error);
      throw error;
    }
  }
}
