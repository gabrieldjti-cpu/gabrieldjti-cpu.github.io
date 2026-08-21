# Testes funcionais — RF-04 Foto de Perfil e Exclusão de Conta

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `main`  
**Migration:** `20260820130058_rf04_foto_soft_delete_conta.sql`

## Implementação disponível

### Foto de perfil

- bucket `avatars` com limite de 5 MB;
- formatos permitidos: JPEG, PNG e WebP;
- upload restrito à pasta do próprio usuário;
- leitura pública do arquivo para exibição do avatar;
- atualização do caminho via RPC `atualizar_foto_perfil`;
- substituição remove o avatar antigo quando possível;
- remoção de foto volta ao ícone padrão.

### Exclusão de conta por soft delete

- `profiles.ativo` controla se a conta está ativa;
- `profiles.excluido_em` registra a exclusão lógica;
- RPC `excluir_minha_conta` preserva o perfil e o histórico;
- endereços ativos são desativados;
- lojas pertencentes à conta são desativadas;
- `foto_url` é removida do perfil;
- sessão é encerrada no frontend;
- dados locais de loja e carrinho são limpos;
- uma conta excluída é detectada após autenticação e desconectada automaticamente;
- o navegador não possui permissão de `UPDATE` direto sobre `ativo`, `excluido_em`, `tipo_usuario` ou `foto_url`.

## Casos de teste — foto

| Caso | Resultado |
|---|---|
| Abrir perfil e visualizar controles de foto | ✅ Aprovado |
| Enviar imagem válida (WebP/PNG) | ✅ Aprovado |
| Foto aparecer no avatar | ✅ Aprovado |
| Recarregar página e foto permanecer | ✅ Aprovado |
| Trocar foto e manter somente a nova como referência | ✅ Aprovado |
| Remover foto | ✅ Aprovado |
| Remover também o arquivo do Storage | ✅ Aprovado |
| Rejeitar arquivo acima de 5 MB | ⏳ Teste negativo adicional |
| Rejeitar formato não permitido | ⏳ Teste negativo adicional |

### Evidências verificadas no banco

- primeira foto persistiu após recarregar a página;
- troca de avatar atualizou `profiles.foto_url`;
- após a troca existia somente um arquivo na pasta do usuário no bucket `avatars`;
- o arquivo anterior foi removido do Storage;
- ao remover a foto, `profiles.foto_url` ficou `null`;
- após a remoção, a pasta do usuário ficou sem arquivos de avatar;
- a conta permaneceu ativa durante todos os testes de foto.

## Casos de teste — exclusão de conta

O teste destrutivo foi executado com uma conta descartável criada especificamente para validação.

| Caso | Resultado |
|---|---|
| Confirmar `EXCLUIR` em conta de teste | ✅ Aprovado |
| `profiles.ativo = false` | ✅ Aprovado |
| `profiles.excluido_em` preenchido | ✅ Aprovado |
| `foto_url` removido | ✅ Aprovado |
| Perfil/Auth preservados para soft delete | ✅ Aprovado |
| Sessão é encerrada | ✅ Aprovado |
| Novo login com a conta excluída é detectado e encerrado pelo site | ✅ Aprovado |
| Cancelar a primeira confirmação | ⏳ Teste negativo adicional |
| Digitar texto diferente de `EXCLUIR` e preservar conta | ⏳ Teste negativo adicional |
| Endereços ativos ficam desativados | ➖ Não aplicável à conta usada (0 endereços) |
| Loja pertencente à conta fica inativa | ➖ Não aplicável à conta usada (0 lojas) |
| Pedidos/histórico permanecem no banco | ➖ Conta usada não possuía pedidos; preservação é garantida pela implementação |

### Evidências verificadas no banco e navegador

- antes da exclusão, a conta de teste estava ativa;
- após a exclusão, `profiles.ativo = false`;
- `profiles.excluido_em` recebeu timestamp;
- `foto_url` ficou `null`;
- o registro de autenticação continuou existindo, caracterizando soft delete e não exclusão física;
- ao tentar entrar novamente, o site detectou rapidamente a conta excluída, exibiu a mensagem correspondente e encerrou a sessão.

## Validação estrutural já aprovada

- colunas `profiles.ativo` e `profiles.excluido_em` existem;
- bucket `avatars` existe, é público e possui limite de 5 MB;
- RPCs `minha_conta_ativa`, `atualizar_foto_perfil` e `excluir_minha_conta` existem;
- `anon` não pode executar as RPCs de conta;
- `authenticated` pode executar as RPCs necessárias;
- `authenticated` pode atualizar campos básicos permitidos do perfil;
- `authenticated` não pode atualizar diretamente `ativo`, `excluido_em` nem `foto_url`;
- políticas de Storage restringem INSERT/UPDATE/DELETE à pasta do usuário autenticado.

## Situação atual

✅ O fluxo principal de **foto de perfil** foi validado no navegador e no banco: upload, persistência, troca, limpeza do arquivo anterior e remoção.

✅ A **exclusão de conta por soft delete** foi validada com conta descartável, incluindo marcação no banco, preservação do usuário de autenticação, encerramento de sessão e bloqueio da conta excluída no fluxo do site.

## Conclusão do RF-04

✅ **RF-04 — Perfil concluído no MVP.**

Os três blocos centrais do requisito foram validados: múltiplos endereços, foto de perfil e exclusão lógica de conta. Os casos negativos adicionais listados acima permanecem úteis para regressão, mas não bloqueiam a conclusão funcional do requisito.
