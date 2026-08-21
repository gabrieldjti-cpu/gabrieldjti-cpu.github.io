-- Comércio da Cidade
-- RF-04/RF-09 — impede bypass do endereço no checkout

begin;

-- O checkout legado continua existindo como função interna reutilizada
-- por finalizar_checkout_endereco(), mas deixa de ser chamável diretamente
-- pelos papéis expostos pela API.
revoke all on function public.finalizar_checkout(text, text, jsonb)
from public, anon, authenticated;

-- Somente o checkout com endereço fica disponível ao cliente autenticado.
revoke all on function public.finalizar_checkout_endereco(text, text, jsonb, uuid)
from public, anon;

grant execute on function public.finalizar_checkout_endereco(text, text, jsonb, uuid)
to authenticated;

commit;
