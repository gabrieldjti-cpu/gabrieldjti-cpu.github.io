# Comércio da Cidade

Classificados locais, no estilo OLX, com perfis de lojista. Qualquer pessoa anuncia de graça dentro de um limite; lojas com assinatura mensal anunciam sem limite. Quem procura vê a oferta, clica em "Tenho interesse" e combina pagamento e entrega direto com quem vende. O site não vende, não recebe pagamentos e não faz entregas.

Os requisitos estão em [`PRD-Classificados.md`](PRD-Classificados.md). O `PRD-Marketplace.md` descreve a versão anterior (marketplace com carrinho e checkout) e fica só como histórico.

## Tecnologias

- HTML, CSS e JavaScript;
- Supabase Auth, PostgreSQL e Storage;
- GitHub Pages para o frontend estático.

## Funcionalidades principais

- cadastro, login, recuperação de senha e perfil;
- anúncios com fotos, categoria, preço, "novo ou usado" (só nas categorias em que faz sentido) e disponível/indisponível;
- plano grátis: 5 anúncios a cada 30 dias, cada um no ar por 60 dias, sem edição;
- lojas com CPF ou CNPJ, aprovação pelo admin e assinatura mensal ativada manualmente (sem limite, sem vencimento, com edição);
- fim da assinatura: loja pausada, anúncios no ar por mais 15 dias e depois fora do ar, com avisos 7 dias antes e no fim;
- aprovação de todo anúncio e de toda edição de lojista pela administração;
- busca com filtros de categoria, condição, preço e disponibilidade;
- página do anúncio com "Falar com o anunciante", "Ir até a loja" e "Tenho interesse";
- Interessados: o vendedor confirma a venda e o comprador avalia; o vendedor responde às avaliações;
- denúncia de anúncios e de avaliações, com moderação pelo admin;
- painel do lojista com resumo dos anúncios, interessados, vendas, nota e assinatura;
- painel administrativo de lojas, anúncios, assinaturas, categorias, usuários, avaliações e moderação;
- central de notificações;
- Central de Ajuda, Como funciona, Planos, Negociação segura, Termos de Uso e Política de Privacidade.

## Estrutura

- páginas HTML na raiz;
- estilos em `css/` e `components/`;
- scripts em `js/` e `components/`;
- migrations em `supabase/migrations/`;
- testes em `tests/`;
- documentação e checklists em `docs/` (alguns documentos são da versão marketplace e ficam como histórico).

## Executar o frontend

Por utilizar arquivos estáticos, o projeto pode ser aberto com uma extensão como Live Server no VS Code ou com um servidor HTTP local.

Exemplo:

```bash
python -m http.server 5500
```

Depois, acesse `http://localhost:5500`.

## Testes

```bash
node --test tests/*.test.js
```

## Supabase

O frontend utiliza apenas a chave pública/publishable do Supabase. Nunca coloque `service_role`, secret key, senha do banco ou token pessoal no repositório.

As migrations incrementais estão em `supabase/migrations/`. As regras de negócio (limite do plano, aprovação, assinatura, avaliação) ficam no banco, em gatilhos e funções, e valem mesmo se alguém tentar burlar a tela. Como as tabelas principais foram criadas antes desse versionamento, consulte `docs/REPRODUCAO-SUPABASE.md` antes de tentar recriar ou sincronizar o banco.

## Segurança

- RLS habilitado nas tabelas expostas;
- operações críticas executadas por RPCs protegidas;
- tabelas de interesse, venda, avaliação e denúncia fechadas para o site, acessadas só por funções;
- CPF/CNPJ da loja visível só para a loja e a administração;
- uploads limitados por proprietário e tipo de arquivo;
- nenhuma chave administrativa deve ser usada no navegador.
