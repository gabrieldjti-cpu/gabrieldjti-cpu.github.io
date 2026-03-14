-- Seeds default plans
INSERT INTO "plans" (id, type, name, description, price, "stripePriceId", "maxProducts", "maxOrders", "maxUsers", features, "createdAt", "updatedAt")
VALUES
  (
    'plan-free',
    'FREE',
    'Plano Gratuito',
    'Perfeito para começar',
    0,
    NULL,
    10,
    50,
    1,
    '{"Até 10 produtos", "Até 50 pedidos/mês", "Suporte por email", "Analytics básica"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan-starter',
    'STARTER',
    'Starter',
    'Para pequenos negócios',
    29,
    NULL,
    100,
    500,
    3,
    '{"Até 100 produtos", "Até 500 pedidos/mês", "Até 3 usuários", "Analytics avançada", "Suporte prioritário", "API access"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan-professional',
    'PROFESSIONAL',
    'Professional',
    'Para negócios em crescimento',
    79,
    NULL,
    1000,
    5000,
    10,
    '{"Até 1000 produtos", "Até 5000 pedidos/mês", "Até 10 usuários", "Analytics em tempo real", "Suporte 24/7", "API completa", "Integrações customizadas"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan-enterprise',
    'ENTERPRISE',
    'Enterprise',
    'Para grandes operações',
    299,
    NULL,
    999999,
    999999,
    999999,
    '{"Produtos ilimitados", "Pedidos ilimitados", "Usuários ilimitados", "SLA garantido", "Suporte dedicado", "Custom integrations", "Data residency", "White-label option"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (type) DO NOTHING;
