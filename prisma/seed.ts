import { PrismaClient, PlanType } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    type: 'FREE' as PlanType,
    name: 'Plano Gratuito',
    description: 'Perfeito para começar',
    price: 0,
    stripePriceId: null,
    maxProducts: 10,
    maxOrders: 50,
    maxUsers: 1,
    features: ['Até 10 produtos', 'Até 50 pedidos/mês', 'Suporte por email', 'Analytics básica'],
  },
  {
    type: 'STARTER' as PlanType,
    name: 'Starter',
    description: 'Para pequenos negócios',
    price: 29,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    maxProducts: 100,
    maxOrders: 500,
    maxUsers: 3,
    features: [
      'Até 100 produtos',
      'Até 500 pedidos/mês',
      'Até 3 usuários',
      'Analytics avançada',
      'Suporte prioritário',
      'API access',
    ],
  },
  {
    type: 'PROFESSIONAL' as PlanType,
    name: 'Professional',
    description: 'Para negócios em crescimento',
    price: 79,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
    maxProducts: 1000,
    maxOrders: 5000,
    maxUsers: 10,
    features: [
      'Até 1000 produtos',
      'Até 5000 pedidos/mês',
      'Até 10 usuários',
      'Analytics em tempo real',
      'Suporte 24/7',
      'API completa',
      'Integrações customizadas',
    ],
  },
  {
    type: 'ENTERPRISE' as PlanType,
    name: 'Enterprise',
    description: 'Para grandes operações',
    price: 299,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    maxProducts: 999999,
    maxOrders: 999999,
    maxUsers: 999999,
    features: [
      'Produtos ilimitados',
      'Pedidos ilimitados',
      'Usuários ilimitados',
      'SLA garantido',
      'Suporte dedicado',
      'Custom integrations',
      'Data residency',
      'White-label option',
    ],
  },
];

async function main() {
  console.log('Seeding planos padrão...');

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { type: plan.type },
      update: plan,
      create: plan,
    });
    console.log(`✓ ${plan.name}`);
  }

  console.log('✓ Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
