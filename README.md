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
- pesquisa full-text de produtos por nome e descrição, com relevância, autocomplete, filtros e paginação;
- páginas de categoria com lojas, produtos e filtros hierárquicos;
- produtos organizados por categoria e subcategoria, preço promocional e controle de estoque;
- carrinho com produtos de múltiplas lojas;
- checkout manual com endereço salvo;
- gestão de pedidos, rastreio e cancelamento;
- avaliações e resposta do lojista;
- histórico de compras e recompra;
- dashboards de lojista e administrador.

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

O acompanhamento atualizado está em `docs/STATUS-PRD.md`. Recursos como favoritos, cupons, relatórios avançados e pagamento real permanecem no roadmap.

## Segurança

- RLS habilitado nas tabelas expostas;
- operações críticas executadas por RPCs protegidas;
- produtos e contas usam exclusão lógica;
- uploads são limitados por proprietário e tipo de arquivo;
- nenhuma chave administrativa deve ser usada no navegador.
