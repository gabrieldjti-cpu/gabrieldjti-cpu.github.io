-- =====================================================================
-- ETAPA 12 (parte 2): APAGAR CARRINHO, PEDIDOS E DOCUMENTOS ANTIGOS
-- =====================================================================
-- Rode depois da parte 1 (20261009030000), que já tirou essas tabelas
-- das funções que o site ainda usa.
--
-- Este script APAGA tabelas e funções e não tem volta. Ele roda dentro
-- de uma transação: se qualquer linha der erro, nada é apagado.
--
-- O que sai:
--   * tabelas: carrinho, pedidos, itens_pedido, solicitacoes_cancelamento,
--     avaliacoes (avaliação de pedido), movimentacoes_estoque,
--     documentos_loja (fotos de documento) e teste;
--   * gatilhos de estoque e de pedido;
--   * funções de checkout, pedido, cancelamento, avaliação de pedido,
--     clientes da loja, documentos e a busca antiga.
-- O que fica: endereços do perfil, produto_metricas (usada pela busca),
-- denúncias de anúncio e tudo dos classificados.
-- =====================================================================

begin;

-- Cadastro de loja que falhou no meio: não depende mais de documentos.
create or replace function public.cancelar_cadastro_loja_incompleto(p_loja_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  delete from public.lojas loja
  where loja.id = p_loja_id
    and loja.proprietario_id = v_uid
    and loja.status_aprovacao = 'pendente'
    and loja.tipo = 'loja'
    and not exists (
      select 1 from public.produtos produto where produto.loja_id = loja.id
    );

  return found;
end;
$$;

-- Gatilhos de estoque na tabela de anúncios.
drop trigger if exists trg_registrar_movimentacao_estoque on public.produtos;
drop trigger if exists notificar_estoque_baixo_trigger on public.produtos;

-- Tabelas de compra e de documentos (os gatilhos delas saem junto).
drop table if exists public.itens_pedido cascade;
drop table if exists public.solicitacoes_cancelamento cascade;
drop table if exists public.avaliacoes cascade;
drop table if exists public.pedidos cascade;
drop table if exists public.carrinho cascade;
drop table if exists public.movimentacoes_estoque cascade;
drop table if exists public.documentos_loja cascade;
drop table if exists public.teste cascade;

-- Funções que só serviam para compra, pedido e documentos.
drop function if exists private.listar_clientes_loja_core(uuid,text,integer,text,integer,integer);
drop function if exists private.notificar_avaliacao();
drop function if exists private.notificar_cancelamento();
drop function if exists private.notificar_estoque_baixo();
drop function if exists private.notificar_pedido();
drop function if exists private.recalcular_metricas_produtos(uuid[]);
drop function if exists private.resumo_clientes_loja_core(uuid,integer);
drop function if exists private.sincronizar_metricas_avaliacao();
drop function if exists private.sincronizar_metricas_item_pedido();
drop function if exists private.sincronizar_metricas_status_pedido();
drop function if exists public.analisar_documento_loja_admin(uuid,text,text);
drop function if exists public.atualizar_status_pedido_loja(uuid,text,text);
drop function if exists public.avaliar_produto_cliente(uuid,uuid,integer,text);
drop function if exists public.bloquear_envio_com_cancelamento_pendente();
drop function if exists public.buscar_produtos_publicos(text,integer,uuid,integer,text,numeric,numeric,numeric,text,integer,integer);
drop function if exists public.cancelar_pedido_cliente(uuid,text);
drop function if exists public.cancelar_pedido_loja(uuid,text);
drop function if exists public.confirmar_entrega_cliente(uuid);
drop function if exists public.enviar_documento_loja(uuid,uuid,text,text,text,text,text,text,bigint);
drop function if exists public.finalizar_checkout(text,text,jsonb);
drop function if exists public.finalizar_checkout_endereco(text,text,jsonb,uuid);
drop function if exists public.listar_avaliacoes_loja();
drop function if exists public.listar_avaliacoes_produto(uuid);
drop function if exists public.listar_clientes_loja(uuid,text,integer,text,integer,integer);
drop function if exists public.listar_documentos_loja_admin(uuid);
drop function if exists public.listar_lojas_historico_cliente();
drop function if exists public.listar_solicitacoes_cancelamento_cliente();
drop function if exists public.listar_solicitacoes_cancelamento_loja();
drop function if exists public.obter_resumo_avaliacoes_produto(uuid);
drop function if exists public.proteger_cancelamento_pedido();
drop function if exists public.registrar_movimentacao_estoque();
drop function if exists public.responder_avaliacao_loja(uuid,text);
drop function if exists public.responder_solicitacao_cancelamento_loja(uuid,boolean,text);
drop function if exists public.resumo_clientes_loja(uuid,integer);
drop function if exists public.sincronizar_carrinho_usuario(jsonb);
drop function if exists public.solicitar_cancelamento_cliente(uuid,text);

commit;
