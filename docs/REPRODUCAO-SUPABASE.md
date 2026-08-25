# Reprodução segura do Supabase

O banco remoto foi criado antes do início do versionamento completo das migrations. Por isso, as migrations existentes são incrementais e pressupõem que tabelas como `profiles`, `lojas`, `produtos`, `pedidos`, `itens_pedido` e `avaliacoes` já existam.

## Objetivo

Gerar uma baseline baseada no schema remoto real, sem inventar SQL e sem reaplicar a estrutura sobre o projeto de produção.

## Procedimento recomendado

1. Instalar o Supabase CLI e confirmar a versão:

   ```bash
   supabase --version
   ```

2. Criar uma branch exclusiva para a baseline.

3. Autenticar e vincular o projeto remoto correto:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

4. Conferir o vínculo antes de continuar:

   ```bash
   supabase projects list
   supabase migration list
   ```

5. Gerar a baseline a partir do banco remoto:

   ```bash
   supabase db pull
   ```

6. Revisar cuidadosamente a migration gerada, principalmente:

   - extensões;
   - funções `SECURITY DEFINER`;
   - `search_path`;
   - grants para `anon` e `authenticated`;
   - policies RLS;
   - buckets e policies de Storage;
   - possíveis comandos `DROP` inesperados.

7. Validar em ambiente local descartável:

   ```bash
   supabase start
   supabase db reset
   ```

8. Confirmar que todas as migrations são aplicadas do zero e que as tabelas, funções, triggers, policies e índices esperados são recriados.

## Cuidados obrigatórios

- Não executar `supabase db reset --linked` no projeto de produção.
- Não criar uma baseline manual usando apenas o PRD; os nomes reais do banco são diferentes em vários pontos.
- Não copiar dados reais de usuários para `seed.sql`.
- Não fazer `db push` até revisar a migration e a situação do histórico remoto.
- Manter `.temp`, `.branches`, senhas e tokens fora do Git.

## Estado atual

- migrations incrementais versionadas: 13;
- RLS habilitado nas tabelas públicas atuais;
- migrations locais e remotas incrementais correspondentes;
- baseline anterior à primeira migration: pendente de geração pelo CLI;
- projeto remoto: saudável na verificação de 24/08/2026.

Referência oficial: [Local development workflow](https://supabase.com/docs/guides/local-development/cli-workflows).
