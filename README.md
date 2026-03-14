# SaaS E-commerce Platform

Uma plataforma de e-commerce escalável, moderna e pronta para produção, construída com Next.js 15, TypeScript, Prisma e PostgreSQL.

## Arquitetura

### Stack Tecnológico

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Payments**: Stripe
- **Caching**: Upstash Redis (futuro)
- **Monitoring**: Sentry (futuro)

### Características Principais

- ✅ Multi-tenancy com Organizations
- ✅ RBAC (Role-Based Access Control) completo
- ✅ E-commerce com produtos, carrinho e pedidos
- ✅ Pagamentos integrados com Stripe
- ✅ Planos tiered com limites por feature
- ✅ Sistema de auditoria
- ✅ Responsivo e acessível
- ✅ TypeScript em 100%
- ✅ Design system com componentes reutilizáveis

## Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rotas de autenticação
│   ├── (dashboard)/       # Rotas protegidas do dashboard
│   ├── api/               # API routes
│   ├── globals.css        # Estilos globais
│   └── layout.tsx         # Root layout
├── components/            # Componentes React reutilizáveis
├── lib/                   # Utilitários e helpers
├── types/                 # Tipos TypeScript
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   ├── seed.ts            # Seed de dados padrão
│   └── migrations/        # Migrações SQL
├── middleware.ts          # Middleware Next.js
└── public/                # Arquivos estáticos
```

## Começando

### Pré-requisitos

- Node.js 18+
- npm, yarn, pnpm ou bun
- Conta Neon (PostgreSQL)
- Conta Stripe (opcional, para pagamentos)

### Instalação

1. Clone o repositório

```bash
git clone <seu-repo>
cd saas-ecommerce-platform
```

2. Instale as dependências

```bash
pnpm install
# ou
npm install
```

3. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e adicione:
- `DATABASE_URL`: String de conexão Neon PostgreSQL
- `NEXTAUTH_SECRET`: Chave secreta (gere com: `openssl rand -base64 32`)
- `NEXTAUTH_URL`: URL da aplicação
- `STRIPE_*`: Chaves do Stripe (se usar)

4. Configure o banco de dados

```bash
# Execute as migrações
pnpm prisma migrate deploy

# (Opcional) Seed com dados padrão
pnpm prisma db seed
```

5. Inicie o servidor de desenvolvimento

```bash
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Desenvolvimento

### Criar uma nova migração

```bash
pnpm prisma migrate dev --name nome_da_migracao
```

### Visualizar dados no Studio Prisma

```bash
pnpm prisma studio
```

### Gerar tipos Prisma

```bash
pnpm prisma:generate
```

## Roadmap de Desenvolvimento

### Fase 1: Setup Inicial ✅
- [x] Estrutura Next.js 15 com TypeScript
- [x] Configuração Tailwind CSS e design tokens
- [x] Schema Prisma com multi-tenancy
- [x] Componentes base (Button, Input, Card)
- [x] Middleware de proteção de rotas

### Fase 2: Autenticação ✅
- [x] NextAuth.js v5 setup
- [x] Página de signup com validação
- [x] Página de login
- [x] Proteção de sessão
- [x] Hook useAuth customizado

### Fase 3: E-commerce ✅
- [x] API de produtos (CRUD)
- [x] API de carrinho
- [x] Componente ProductCard
- [x] Página de catálogo
- [x] Página de carrinho de compras
- [x] Checkout com formulário
- [x] API de pedidos
- [x] Página de detalhes do pedido
- [x] Página de histórico de pedidos

### Fase 4: Multi-tenancy & Permissões ✅
- [x] System RBAC (Owner, Admin, Manager, Seller, Customer)
- [x] API de organizações (CRUD)
- [x] Gestão de membros (add/edit/remove)
- [x] Permissões baseadas em roles
- [x] Dashboard de organização
- [x] Utilitários de controle de acesso

### Fase 5: Monetização ✅
- [x] Integração Stripe (checkout)
- [x] Gestão de planos tiered
- [x] Webhook Stripe para atualizar status
- [x] Página de billing
- [x] Componente PricingCards
- [x] API de planos de assinatura

### Fase 6: Produção ✅
- [x] Configuração Vercel (vercel.json)
- [x] Documentação de deployment
- [x] Variáveis de ambiente para produção
- [x] Navbar com autenticação
- [x] Documentação completa

## Recursos Disponíveis

### API Routes

#### Autenticação
- `POST /api/auth/signup` - Criar novo usuário
- `POST /api/auth/[...nextauth]` - NextAuth provider

#### Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `GET /api/products/[id]` - Detalhes do produto
- `PUT /api/products/[id]` - Atualizar produto
- `DELETE /api/products/[id]` - Deletar produto

#### Carrinho
- `GET /api/cart` - Ver carrinho do usuário
- `POST /api/cart` - Adicionar ao carrinho
- `PUT /api/cart/[id]` - Atualizar quantidade
- `DELETE /api/cart/[id]` - Remover do carrinho

#### Pedidos
- `GET /api/orders` - Listar pedidos do usuário
- `POST /api/orders` - Criar pedido
- `GET /api/orders/[id]` - Detalhes do pedido

#### Organizações
- `GET /api/organizations` - Listar organizações do usuário
- `POST /api/organizations` - Criar organização
- `GET /api/organizations/[slug]` - Detalhes da organização
- `PUT /api/organizations/[slug]` - Atualizar organização

#### Membros
- `GET /api/organizations/[slug]/members` - Listar membros
- `POST /api/organizations/[slug]/members` - Adicionar membro
- `PUT /api/organizations/[slug]/members/[id]` - Atualizar role
- `DELETE /api/organizations/[slug]/members/[id]` - Remover membro

#### Billing & Payments
- `POST /api/checkout` - Criar sessão de checkout Stripe
- `GET /api/subscription-plans` - Listar planos disponíveis
- `POST /api/webhooks/stripe` - Webhook do Stripe

### Páginas Principais

**Públicas:**
- `/` - Landing page
- `/login` - Página de login
- `/signup` - Página de cadastro

**Protegidas (Autenticado):**
- `/dashboard` - Dashboard inicial
- `/catalog` - Catálogo de produtos
- `/cart` - Carrinho de compras
- `/checkout` - Checkout
- `/orders` - Histórico de pedidos
- `/orders/[id]` - Detalhes do pedido

**Organizações:**
- `/organizations` - Lista de organizações
- `/org/[slug]` - Dashboard da organização
- `/org/[slug]/members` - Gerenciar membros
- `/org/[slug]/billing` - Planos e faturamento

## Deployment

Para instruções detalhadas de deployment, veja [DEPLOYMENT.md](./DEPLOYMENT.md).

### Deploy Rápido no Vercel

```bash
# 1. Faça push ao repositório
git push origin main

# 2. Vercel detectará automaticamente e fará deploy
# ou use a CLI:
vercel
```

Após deploy:
1. Configure variáveis de ambiente no painel Vercel
2. Execute migrações do banco de dados
3. Configure webhooks do Stripe
4. Teste o checkout completo

---

**Status**: ✅ MVP Completo - Arquitetura SaaS Escalável Implementada

Última atualização: 2026-03-13
