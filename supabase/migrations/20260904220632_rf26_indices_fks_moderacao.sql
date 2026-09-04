-- RF-26: índices de cobertura para as novas foreign keys da moderação.

begin;

create index if not exists produtos_moderado_por_idx
  on public.produtos (moderado_por)
  where moderado_por is not null;

create index if not exists avaliacoes_moderado_por_idx
  on public.avaliacoes (moderado_por)
  where moderado_por is not null;

create index if not exists denuncias_loja_id_idx
  on public.denuncias_conteudo (loja_id);

create index if not exists denuncias_analisado_por_idx
  on public.denuncias_conteudo (analisado_por)
  where analisado_por is not null;

commit;
