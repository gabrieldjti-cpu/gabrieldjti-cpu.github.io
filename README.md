# Comércio da Cidade

Marketplace web multi-lojas para conectar clientes e comerciantes locais em um único portal.

## Tecnologias

- HTML, CSS e JavaScript;
- Supabase Auth, PostgreSQL e Storage;
- GitHub Pages para o frontend estático.

## Funcionalidades principais

- cadastro, login e recuperação de senha;
- perfil, foto e múltiplos endereços;
- cadastro e aprovação administrativa de lojas;
- painel administrativo de usuários com filtros, bloqueio, papéis e auditoria;
- pesquisa full-text de produtos por nome e descrição, com relevância, autocomplete, filtros de preço/nota, métricas de vendas e paginação;
- página individual do produto com galeria, avaliações, informações da loja, entrega, compartilhamento e produtos relacionados;
- páginas de categoria com lojas, produtos e filtros hierárquicos;
- painel administrativo de categorias, subcategorias e destaques da página inicial;
- produtos organizados por categoria e subcategoria, preço promocional e controle de estoque;
- carrinho com produtos de múltiplas lojas, persistido por conta autenticada, mesclado após o login e com frete estimado por loja;
- checkout manual com endereço salvo e resumo separado de produtos, entrega e total;
- gestão de pedidos, rastreio e cancelamento;
- painel privado de clientes do lojista, com métricas e histórico de pedidos;
- avaliações e resposta do lojista;
- histórico de compras e recompra;
- dashboards de lojista e administrador.
- Central de Ajuda pública com busca em perguntas frequentes, guia de funcionamento, Termos de Uso, Política de Privacidade e regras de cancelamento e reembolso.

## Estrutura

- páginas HTML na raiz;
- estilos em `css/` e `components/`;
- scripts em `js/` e `components/`;
- migrations em `supabase/migrations/`;
- documentação e checklists em `docs/`;
- requisitos oficiais em `PRD-Marketplace.md`.

## Executar o frontend

Por utilizar arquivos estáticos, o projeto pode ser aberto com uma extensão como Live Server no VS Code ou com um servidor HTTP local.

Exemplo:

```bash
python -m http.server 5500
```

Depois, acesse `http://localhost:5500`.

## Supabase

O frontend utiliza apenas a chave pública/publishable do Supabase. Nunca coloque `service_role`, secret key, senha do banco ou token pessoal no repositório.

As migrations incrementais estão em `supabase/migrations/`. Como as tabelas principais foram criadas antes desse versionamento, consulte `docs/REPRODUCAO-SUPABASE.md` antes de tentar recriar ou sincronizar o banco.

## Estado do PRD

O acompanhamento atualizado está em `docs/STATUS-PRD.md`. Cupons, relatórios avançados e pagamento real permanecem no roadmap.

## Segurança

- RLS habilitado nas tabelas expostas;
- operações críticas executadas por RPCs protegidas;
- produtos e contas usam exclusão lógica;
- uploads são limitados por proprietário e tipo de arquivo;
- nenhuma chave administrativa deve ser usada no navegador.
