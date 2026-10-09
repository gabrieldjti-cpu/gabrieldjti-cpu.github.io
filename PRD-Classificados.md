# PRD — Comércio da Cidade: classificados locais

**Versão:** 2.0
**Data:** Outubro de 2026
**Status:** Em uso. Substitui o `PRD-Marketplace.md` (versão 1.0, marketplace com carrinho e checkout), que fica no repositório só como histórico.
**Apresentação:** feira de tecnologia, 30 de outubro de 2026
**Stack:** HTML, CSS e JavaScript no GitHub Pages; Supabase (PostgreSQL, Auth, Storage)

---

## 1. Visão geral

### 1.1 Objetivo

O Comércio da Cidade é um site de **classificados locais**, no estilo OLX, com **perfis de lojista**. Qualquer pessoa pode anunciar de graça dentro de um limite; lojas com assinatura mensal anunciam sem limite. Quem procura vê a oferta, avisa o vendedor com "Tenho interesse" e combina pagamento e entrega direto com ele, pelo WhatsApp ou na loja.

O site **não vende, não recebe pagamentos e não faz entregas**. Ele organiza os anúncios, aprova o que vai ao ar, aproxima comprador e vendedor e guarda a reputação de quem vende.

### 1.2 Problema que resolve

| Problema | Como o site resolve |
|---|---|
| Vizinhos e pequenos comércios não têm onde anunciar na própria cidade | Anúncio grátis e categorias locais |
| Marketplace com checkout é caro e complexo para uma loja de bairro | Sem pagamento online: o contato é direto |
| Falta de confiança em anúncios de desconhecidos | Aprovação de todo anúncio e avaliação só depois de venda confirmada |
| Lojas querem mais visibilidade que um vizinho | Assinatura de lojista: sem limite, sem vencimento e com edição |

### 1.3 Público

1. **Visitantes e compradores:** procuram produtos e serviços na cidade.
2. **Anunciantes comuns:** pessoas que vendem algo de vez em quando (plano grátis).
3. **Lojistas:** comércios que anunciam com frequência (assinatura mensal).
4. **Administração:** aprova anúncios, lojas e assinaturas e modera denúncias.

---

## 2. Regras de negócio

### 2.1 Plano grátis (usuário comum)

- Até **5 anúncios a cada 30 dias**. O ciclo começa no primeiro anúncio.
- Cada anúncio fica no ar por **60 dias**.
- Excluir um anúncio **não devolve** a vaga. Anúncio **recusado** pela administração não conta.
- O anúncio publicado **não pode ser editado**: só marcado como indisponível ou excluído.

### 2.2 Assinatura de lojista

- Mensal, **ativada manualmente** pela administração depois que o lojista pede no painel e combina o pagamento.
- Anúncios **sem limite** e **sem vencimento**. O lojista **pode editar**: a edição vai para a fila do admin e a versão antiga continua no ar até a aprovação.
- A loja informa **CPF ou CNPJ** (sem foto de documento) e é aprovada pela administração.
- Um usuário comum pode virar lojista em "Quero ser lojista": os anúncios dele passam para a loja.

### 2.3 Fim da assinatura

- **7 dias antes** do fim, o lojista recebe um aviso.
- Ao terminar, a loja fica **pausada por 15 dias**: os anúncios continuam no ar, mas a loja não publica nem edita.
- Depois dos 15 dias, a loja e os anúncios **saem do ar e das buscas**, e o lojista recebe outro aviso. Voltam sozinhos quando a assinatura é renovada.
- Loja aprovada que ainda não tem assinatura não publica anúncios.

### 2.4 Aprovação

- **Todo anúncio**, de usuário comum ou de lojista, passa pela aprovação do admin antes de ir ao ar.
- Toda **edição** de lojista também.

### 2.5 Categorias e condição

- Categorias e subcategorias no estilo OLX, gerenciadas pelo admin.
- Cada categoria indica se pede **"novo ou usado"**. A subcategoria segue a principal.
- A disponibilidade é só **disponível** ou **indisponível** (sem quantidade em estoque).

### 2.6 Interesse, venda e avaliação

1. O comprador clica em **"Tenho interesse"**. O vendedor é avisado.
2. O vendedor vê a lista de **Interessados** e **confirma a venda** para um deles (pode marcar o anúncio como indisponível na mesma hora).
3. Só então o comprador **avalia o vendedor** (1 a 5 estrelas e comentário), uma vez por venda.
4. Se o vendedor não confirmar, o comprador pode **pedir a confirmação** (uma vez a cada 24 horas) ou **denunciar** o anúncio.
5. A avaliação fica no **perfil** do usuário comum ou na **loja** do lojista. O vendedor pode **responder**.
6. Qualquer usuário pode **denunciar uma avaliação**; o admin oculta, mostra de novo ou mantém e descarta as denúncias.

---

## 3. Requisitos funcionais

| Código | Requisito | Situação |
|---|---|---|
| RF-01 | Cadastro, login, recuperação de senha e perfil | Feito |
| RF-02 | Publicar anúncio com fotos, categoria, preço, condição e disponibilidade | Feito |
| RF-03 | Limite e vencimento do plano grátis | Feito |
| RF-04 | Meus anúncios: situação, limite restante, marcar indisponível, excluir | Feito |
| RF-05 | Busca com filtros de categoria, condição, preço e disponibilidade | Feito |
| RF-06 | Página do anúncio com "Falar com o anunciante", "Ir até a loja" e "Tenho interesse" | Feito |
| RF-07 | Favoritos | Feito |
| RF-08 | Cadastro de loja com CPF ou CNPJ e "Quero ser lojista" | Feito |
| RF-09 | Pedido e ativação manual da assinatura; pausa e saída do ar no fim | Feito |
| RF-10 | Painel do lojista: resumo dos anúncios, interessados, vendas, nota e assinatura | Feito |
| RF-11 | Interessados, confirmação de venda e avaliação do vendedor | Feito |
| RF-12 | Resposta do vendedor e denúncia de avaliação | Feito |
| RF-13 | Admin: aprovação de lojas, anúncios e edições | Feito |
| RF-14 | Admin: assinaturas, categorias, usuários, denúncias e avaliações | Feito |
| RF-15 | Central de notificações (anúncio aprovado, interessado, venda, avaliação, assinatura) | Feito |

---

## 4. Requisitos não funcionais

- **Segurança:** RLS em todas as tabelas expostas; regras de negócio (limite, aprovação, assinatura, avaliação) aplicadas no banco por gatilhos e funções, não só na tela; o navegador usa apenas a chave pública.
- **Privacidade:** CPF/CNPJ só para a loja e o admin; nas avaliações públicas aparece só o primeiro nome.
- **Responsividade e acessibilidade:** layout para celular e computador, HTML semântico, navegação por teclado e modo escuro.
- **Testes:** testes automáticos em `tests/` (`node --test tests/*.test.js`).

---

## 5. Fluxos principais

**Quem procura:** busca → página do anúncio → "Tenho interesse" → conversa no WhatsApp → venda confirmada pelo vendedor → avaliação.

**Anunciante comum:** criar conta → anunciar → aguardar aprovação → receber interessados → confirmar venda → responder avaliações.

**Lojista:** cadastrar loja (CPF/CNPJ) → aprovação → pedir assinatura → admin ativa → anunciar sem limite e editar → avisos de fim da assinatura.

**Admin:** aprovar lojas, anúncios e edições → ativar e encerrar assinaturas → moderar denúncias de anúncios e de avaliações → gerenciar categorias e usuários.

---

## 6. Dados (principais tabelas)

| Tabela | Uso |
|---|---|
| `profiles` | Dados da conta |
| `lojas` | Perfil de quem anuncia: `tipo = 'pessoal'` (usuário comum) ou `'loja'` |
| `produtos` | Anúncios: aprovação, condição, disponibilidade (0/1) e vencimento |
| `edicoes_anuncio` | Edições de lojista aguardando aprovação |
| `categorias_produtos` | Categorias e subcategorias; `pede_condicao` |
| `planos`, `assinaturas`, `solicitacoes_assinatura` | Planos e assinatura de lojista |
| `dados_fiscais_loja` | CPF ou CNPJ da loja (privado) |
| `interesses_anuncio`, `vendas_anuncio` | "Tenho interesse" e venda confirmada |
| `avaliacoes_vendedor`, `denuncias_avaliacao_vendedor` | Avaliações, respostas e denúncias |
| `notificacoes` | Avisos no sininho |

As tabelas de carrinho e pedidos do modelo antigo continuam no banco, sem uso, até a limpeza depois da feira.

---

## 7. Roadmap

- **Até a feira (30/10/2026):** testes com dados reais e ajustes.
- **Depois da feira:** apagar os arquivos de compra do repositório e aposentar tabelas, gatilhos e funções de pedido.
- **Ideias:** anúncio em destaque como benefício do assinante; comparação do mesmo item entre anunciantes; aviso de "anúncio vence amanhã".
