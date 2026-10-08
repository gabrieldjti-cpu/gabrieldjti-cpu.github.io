-- Corrige o acesso do lojista aos próprios documentos de validação.
--
-- As duas políticas de leitura abaixo chamavam public._usuario_e_admin,
-- que não pode ser executada pelo papel "authenticated". Com isso a
-- leitura falhava com "permissão negada" (HTTP 403) para qualquer
-- lojista: o painel não carregava a documentação, o envio de arquivos
-- para o bucket documentos-lojas falhava e a loja nunca podia ser
-- aprovada.
--
-- Agora usam public.sou_admin(), que tem a mesma regra e pode ser
-- chamada por usuários logados. Quem pode ler continua igual: o dono
-- da loja e o administrador.

alter policy documentos_loja_select_owner_admin
  on public.documentos_loja
  using (
    exists (
      select 1
      from public.lojas loja
      where loja.id = documentos_loja.loja_id
        and loja.proprietario_id = (select auth.uid())
    )
    or (select public.sou_admin())
  );

alter policy documentos_lojas_select_owner_admin
  on storage.objects
  using (
    bucket_id = 'documentos-lojas'
    and (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      or (select public.sou_admin())
    )
  );
