import Stripe from 'stripe';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acpi',
});

export async function createCheckoutSession(
  organizationId: string,
  planId: string,
  userEmail: string,
  returnUrl: string
) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error('Plano não encontrado');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: plan.name,
            description: plan.description || undefined,
          },
          unit_amount: Math.round(plan.monthlyPrice * 100),
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    customer_email: userEmail,
    metadata: {
      organizationId,
      planId,
    },
  });

  return session;
}

export async function createOrganizationSubscription(
  organizationId: string,
  planId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
) {
  // Finaliza qualquer assinatura anterior
  const existing = await prisma.organizationSubscription.findUnique({
    where: { organizationId },
  });

  if (existing?.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
  }

  return prisma.organizationSubscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      subscriptionPlanId: planId,
      stripeCustomerId,
      stripeSubscriptionId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      subscriptionPlanId: planId,
      stripeCustomerId,
      stripeSubscriptionId,
      status: 'active',
    },
  });
}

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;

      if (organizationId) {
        await prisma.organizationSubscription.update({
          where: { organizationId },
          data: {
            status: subscription.status === 'active' ? 'active' : 'cancelled',
            currentPeriodStart: new Date(
              subscription.current_period_start * 1000
            ),
            currentPeriodEnd: new Date(
              subscription.current_period_end * 1000
            ),
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;

      if (organizationId) {
        await prisma.organizationSubscription.update({
          where: { organizationId },
          data: { status: 'cancelled' },
        });
      }
      break;
    }
  }
}

export { stripe };
