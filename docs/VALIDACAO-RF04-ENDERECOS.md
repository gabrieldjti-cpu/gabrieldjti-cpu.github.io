# Validação funcional — RF-04 Múltiplos Endereços

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Data:** 19/08/2026  
**Branch:** `feat/concluir-mvp-prd`

## Escopo validado

Este documento registra a validação funcional do subfluxo de múltiplos endereços do RF-04 e sua integração com o checkout.

## Casos testados

| Caso | Resultado |
|---|---|
| Criar novo endereço | ✅ Aprovado |
| Editar endereço existente | ✅ Aprovado |
| Manter o mesmo ID após edição | ✅ Aprovado |
| Definir endereço padrão | ✅ Aprovado |
| Trocar endereço padrão | ✅ Aprovado |
| Garantir apenas um padrão ativo por cliente | ✅ Aprovado |
| Sincronizar endereço padrão com `profiles` | ✅ Aprovado |
| Excluir endereço por soft delete | ✅ Aprovado |
| Selecionar endereço completo no checkout | ✅ Aprovado |
| Finalizar pedido autenticado | ✅ Aprovado |
| Gravar `pedidos.endereco_id` | ✅ Aprovado |
| Gravar snapshot em `pedidos.endereco_entrega` | ✅ Aprovado |
| Preservar snapshot após editar endereço cadastrado | ✅ Aprovado |
| Manter total e itens coerentes no pedido | ✅ Aprovado |

## Evidências verificadas no banco

- exclusão lógica grava `ativo = false` e `excluido_em`;
- endereço padrão permanece único por cliente;
- checkout rejeita o fluxo legado sem endereço e usa `finalizar_checkout_endereco`;
- pedido criado guarda referência ao endereço usado;
- `endereco_entrega` mantém os dados capturados no momento da compra;
- editar o endereço cadastrado posteriormente não altera o snapshot do pedido antigo.

## Conclusão

✅ **O subfluxo de múltiplos endereços do RF-04 foi validado ponta a ponta e pode ser considerado concluído.**

As partes restantes do RF-04 — foto de perfil e exclusão de conta por soft delete — já foram implementadas posteriormente e possuem checklist funcional próprio em `docs/TESTES-RF04-FOTO-CONTA.md`. Elas devem ser testadas antes de marcar o RF-04 geral como totalmente concluído.
