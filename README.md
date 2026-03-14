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
- [x] Estrutura Next.js com TypeScript
- [x] Configuração Tailwind CSS
- [x] Schema Prisma com multi-tenancy
- [x] Componentes base
- [x] Middleware de proteção

### Fase 2: Autenticação (Próxima)
- [ ] NextAuth.js v5 setup
- [ ] Página de signup com validação
- [ ] Página de login
- [ ] Recuperação de senha
- [ ] Email verification

### Fase 3: E-commerce
- [ ] Dashboard de produtos
- [ ] CRUD de produtos
- [ ] Página de catálogo
- [ ] Carrinho de compras
- [ ] Checkout e pagamento

### Fase 4: Multi-tenancy & Permissões
- [ ] System RBAC
- [ ] Gestão de membros
- [ ] Limites por plano

### Fase 5: Monetização
- [ ] Integração Stripe
- [ ] Gestão de subscriptions
- [ ] Webhooks Stripe

### Fase 6: Produção
- [ ] Performance optimization
- [ ] SEO
- [ ] Monitoring
- [ ] Deployment

## Deployment

### Vercel

```bash
# Instale a CLI Vercel
npm i -g vercel

# Faça o deploy
vercel
```

Variáveis de ambiente serão configuradas no painel Vercel.

---

**Status**: 🚀 Em desenvolvimento ativo

Última atualização: 2025-03-13
