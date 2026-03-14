# Guia de Deployment no Vercel

## Pré-requisitos

- Conta GitHub conectada ao Vercel
- Projeto conectado ao repositório
- Variáveis de ambiente configuradas
- Banco de dados Neon configurado

## Passos para Deploy

### 1. Preparar o Repositório

```bash
# Verifique se todos os arquivos estão commitados
git status

# Faça push para o repositório
git push origin main
```

### 2. Configurar Variáveis de Ambiente no Vercel

No painel do Vercel, vá para **Settings > Environment Variables** e adicione:

#### Banco de Dados
- `DATABASE_URL`: String de conexão Neon (postgresql://...)

#### NextAuth
- `NEXTAUTH_SECRET`: Gere com `openssl rand -base64 32`
- `NEXTAUTH_URL`: URL do seu domínio (ex: https://myapp.com)

#### Stripe
- `STRIPE_SECRET_KEY`: Sua chave secreta do Stripe (sk_live_...)
- `STRIPE_WEBHOOK_SECRET`: Seu webhook secret do Stripe
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Sua chave pública (pk_live_...)

### 3. Executar Migrações

Após o deploy, execute as migrações no banco:

```bash
# Localmente com conexão ao banco de produção
PNPM_DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

Ou use a integração Neon diretamente através do console deles.

### 4. Seed de Dados (Planos)

Execute o script de seed para popular os planos de assinatura:

```bash
# Use o dashboard Neon ou execute:
psql "postgresql://..." -f scripts/seed-plans.sql
```

### 5. Webhook do Stripe

Configure o webhook no dashboard do Stripe:

1. Vá para **Webhooks** em Settings
2. Clique em **Add Endpoint**
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Selecione eventos:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o webhook secret e configure a variável `STRIPE_WEBHOOK_SECRET`

## Verificações de Produção

### Segurança
- [ ] `NEXTAUTH_SECRET` é forte e único
- [ ] Todas as variáveis de ambiente estão configuradas
- [ ] Banco de dados tem backups habilitados
- [ ] CORS está configurado corretamente

### Performance
- [ ] Imagens estão otimizadas
- [ ] Cache de ativos estáticos habilitado
- [ ] Compressão de resposta ativa
- [ ] Database indices criados

### Monitoring
- [ ] Logs estão sendo registrados
- [ ] Alertas configurados para erros críticos
- [ ] Verificações de saúde da API (health checks)

## Comandos Úteis

```bash
# Ver logs de build
vercel logs --tail

# Ver variáveis de ambiente
vercel env ls

# Redeploy
vercel --prod

# Verificar URL de produção
vercel inspect
```

## Troubleshooting

### Erro de Conexão ao Banco de Dados
- Verifique se `DATABASE_URL` está correta
- Confirme que a máquina Vercel pode acessar o banco
- Verifique a configuração de firewall do Neon

### Erro de NextAuth
- Verifique se `NEXTAUTH_URL` corresponde ao seu domínio
- Regenere `NEXTAUTH_SECRET` se necessário
- Limpe cookies/cache do navegador

### Erro de Stripe
- Verifique se está usando chaves live (não test)
- Confirme que o webhook está recebendo eventos
- Verifique os logs do Stripe Dashboard

## Scaling para Produção

Conforme cresce:

1. **Cache**: Adicione Redis (Upstash) para cache de sessões
2. **Jobs**: Configure background jobs (cron) com Vercel Crons
3. **Analytics**: Adicione Sentry ou similar para monitoring
4. **CDN**: Use Vercel Edge Network para servir assets
5. **Database**: Considere replicação ou read replicas

## Links Úteis

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Neon Console](https://console.neon.tech)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [NextAuth.js Production](https://next-auth.js.org/deployment)
