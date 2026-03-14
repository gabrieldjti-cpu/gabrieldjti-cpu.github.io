# Guia de Início Rápido

## 1. Configuração Local (5 minutos)

### Passo 1: Clone e Instale
```bash
# Clone o repositório
git clone <seu-repo>
cd saas-ecommerce-platform

# Instale dependências
pnpm install
```

### Passo 2: Configure o Banco de Dados
```bash
# Crie arquivo .env.local
cp .env.local.example .env.local

# Edite .env.local com sua DATABASE_URL do Neon
# (formato: postgresql://user:password@host/database)
```

### Passo 3: Configure NextAuth
```bash
# Gere NEXTAUTH_SECRET
openssl rand -base64 32

# Copie para .env.local como NEXTAUTH_SECRET
# Configure NEXTAUTH_URL para http://localhost:3000
```

### Passo 4: Inicialize o Banco
```bash
# Execute migrações
pnpm prisma migrate deploy

# Popule planos padrão
pnpm prisma db seed
```

### Passo 5: Inicie o Servidor
```bash
# Inicie em desenvolvimento
pnpm dev

# Acesse http://localhost:3000
```

## 2. Primeiros Passos (10 minutos)

### Criar uma Conta
1. Clique em "Cadastro"
2. Preencha email e senha
3. Clique em "Criar Conta"

### Explorar o Dashboard
1. Após login, você verá o dashboard
2. Clique em "Organizações" para criar sua primeira loja

### Criar Organização
1. Clique em "Nova Organização"
2. Defina nome e slug (ex: "minha-loja")
3. Clique em "Criar"

### Adicionar Produtos
1. Acesse a organização
2. Clique em "Gerenciar Produtos"
3. Crie um novo produto com nome, preço e descrição

### Testar Checkout
1. Volte para "/catalog"
2. Adicione produtos ao carrinho
3. Vá para o carrinho e clique em "Ir para Checkout"
4. Preencha informações e finalize

## 3. Estrutura de Pastas

```
projeto/
├── app/
│   ├── (auth)/              # Páginas de login/signup
│   ├── (dashboard)/         # Rotas protegidas
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Estilos globais
│
├── components/              # Componentes React
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   └── ...
│
├── lib/                     # Utilitários
│   ├── auth.ts              # Autenticação
│   ├── db.ts                # Queries do Prisma
│   ├── permissions.ts       # RBAC
│   ├── stripe.ts            # Stripe
│   └── utils.ts             # Helpers
│
├── prisma/
│   ├── schema.prisma        # Schema do banco
│   ├── seed.ts              # Seed inicial
│   └── migrations/          # Migrações SQL
│
├── types/                   # Tipos TypeScript
├── middleware.ts            # Next.js middleware
├── auth.ts                  # NextAuth config
├── auth.config.ts           # NextAuth providers
└── package.json
```

## 4. Fluxo de Dados

### Autenticação
```
1. User preenche signup form
2. POST /api/auth/signup
3. Cria User no banco
4. NextAuth cria sessão
5. Redirecionado para dashboard
```

### E-commerce
```
1. User clica "Adicionar ao Carrinho"
2. POST /api/cart (productId, quantity)
3. Cria CartItem no banco
4. Toast de confirmação
5. Carrinho atualizado com SWR
```

### Pedido
```
1. User preenche checkout
2. POST /api/orders
3. Cria Order e OrderItems
4. Limpa CartItems
5. Stripe checkout (se integrado)
```

### Organizações
```
1. User cria organização
2. POST /api/organizations
3. User criado como OWNER
4. Dashboard da org disponível
5. Pode adicionar membros
```

## 5. Desenvolvimento

### Adicionar Nova Feature
1. Crie rota em `app/`
2. Crie componentes em `components/`
3. Crie API route em `app/api/`
4. Atualize Prisma schema se necessário
5. Execute migração: `pnpm prisma migrate dev`

### Exemplo: Adicionar Campo ao Produto
```typescript
// prisma/schema.prisma
model Product {
  // ... campos existentes
  sku: String?          // Novo campo
  // ... resto do schema
}

// Criar migração
pnpm prisma migrate dev --name add_sku_to_product

// Atualizar componente
// components/ProductCard.tsx - exibir SKU

// Atualizar API
// app/api/products/route.ts - incluir sku
```

### Testar API
```bash
# Usar curl
curl -X GET http://localhost:3000/api/products

# Usar Insomnia/Postman
# Importe requests de documentação

# Usar Prisma Studio
pnpm prisma studio
```

## 6. Integração Stripe (Opcional)

### 1. Criar Conta Stripe
- Vá para https://stripe.com
- Crie uma conta e ative modo teste
- Copie chaves publicável e secreta

### 2. Configurar Variáveis
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### 3. Testar Pagamento
1. Acesse `/org/[slug]/billing`
2. Escolha um plano
3. Use cartão de teste: 4242 4242 4242 4242
4. Qualquer data futura e CVC

### 4. Webhook Local
```bash
# Instale Stripe CLI
brew install stripe/stripe-cli/stripe

# Escute webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copie webhook signing secret
# Adicione a STRIPE_WEBHOOK_SECRET
```

## 7. Deployment (Vercel)

### 1. Preparar Repositório
```bash
git add .
git commit -m "chore: implement saas platform"
git push origin main
```

### 2. Deploy no Vercel
```bash
# Instale Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. Configurar Variáveis em Produção
No painel Vercel → Settings → Environment Variables:
- DATABASE_URL (Neon production)
- NEXTAUTH_SECRET (novo valor)
- NEXTAUTH_URL (seu domínio)
- STRIPE_SECRET_KEY (chaves live)
- etc.

### 4. Migrações em Produção
```bash
# Via Neon console ou via CLI:
DATABASE_URL="prod_url" pnpm prisma migrate deploy
```

## 8. Troubleshooting

### Erro: "DATABASE_URL is not set"
```bash
# Verifique .env.local
cat .env.local | grep DATABASE_URL

# Se vazio, copie do Neon console
```

### Erro: "NEXTAUTH_SECRET is invalid"
```bash
# Gere novo secret
openssl rand -base64 32

# Atualize .env.local
```

### Erro: "Product not found"
```bash
# Verifique se produtos foram criados
pnpm prisma studio
# Acesse Products e crie um novo produto
```

### Erro: "Stripe webhook failed"
```bash
# Verifique webhook signing secret
# Confirme webhook_secret em .env.local
# Reinicie servidor local
```

## 9. Recursos Úteis

### Documentação
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS](https://tailwindcss.com)

### Ferramentas
- [Prisma Studio](http://localhost:5555)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Thunder Client](https://www.thunderclient.com) - Testar APIs

### Comunidade
- [Next.js Discord](https://discord.gg/nextjs)
- [Prisma Discord](https://discord.gg/prisma)
- [Stripe Community](https://support.stripe.com)

## 10. Próximas Features Recomendadas

1. **Email Verification**
   - Verificar email ao cadastrar
   - Enviar confirmação de pedido

2. **Password Reset**
   - Forma de recuperar senha
   - Link seguro com token

3. **Analytics**
   - Dashboard com gráficos
   - Produtos mais vendidos
   - Receita por período

4. **Admin Dashboard**
   - Gerenciar usuários
   - Ver estatísticas globais
   - Moderação de conteúdo

5. **SEO & Performance**
   - Metadata dinâmica
   - Image optimization
   - Cache strategies

---

Você está pronto para começar! Qualquer dúvida, consulte [README.md](./README.md), [FEATURES.md](./FEATURES.md) ou [DEPLOYMENT.md](./DEPLOYMENT.md).
