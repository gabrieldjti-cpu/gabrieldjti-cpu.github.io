# Testes do RF-26 — Moderação de Conteúdo

## Cliente autenticado

1. Abra um produto público e use **Denunciar produto**.
2. Escolha um motivo, envie e confirme a mensagem de sucesso.
3. Tente denunciar o mesmo produto novamente e confirme que a duplicidade é recusada.
4. Em uma avaliação de outro cliente, use **Denunciar avaliação**.
5. Sem login, clique em denunciar, entre na conta e confirme o retorno à página do produto.

## Administrador principal

1. Abra `admin-moderacao.html` e confira indicadores, filtros e paginação.
2. Abra uma denúncia e consulte o histórico.
3. Marque uma denúncia como **improcedente** com justificativa e confirme que o conteúdo continua público.
4. Confirme uma denúncia de produto e verifique que ele desaparece do catálogo.
5. Confirme uma denúncia de avaliação e verifique que ela desaparece da página e deixa de compor a média.
6. Confira administrador, justificativa e data no histórico.

## Segurança e notificações

1. Confirme que uma conta comum não abre o painel de moderação.
2. Confirme que o denunciante não consegue denunciar conteúdo próprio.
3. Confirme que o administrador recebe uma notificação de nova denúncia.
4. Confirme que o denunciante recebe a decisão.
5. Em denúncia procedente, confirme que o responsável pelo conteúdo recebe o aviso.
6. Como lojista, tente reativar um produto moderado e confirme que a operação é bloqueada.

Use conteúdo descartável nos testes de denúncia procedente, pois a moderação preserva o registro e impede a reativação direta pelo lojista.
