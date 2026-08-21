# Testes funcionais — RF-04 Foto de Perfil e Exclusão de Conta

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `feat/concluir-mvp-prd`  
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
| Rejeitar arquivo acima de 5 MB | ⏳ Pendente |
| Rejeitar formato não permitido | ⏳ Pendente |

### Evidências verificadas no banco

- primeira foto persistiu após recarregar a página;
- troca de avatar atualizou `profiles.foto_url`;
- após a troca existia somente um arquivo na pasta do usuário no bucket `avatars`;
- o arquivo anterior foi removido do Storage;
- ao remover a foto, `profiles.foto_url` ficou `null`;
- após a remoção, a pasta do usuário ficou sem arquivos de avatar;
- a conta permaneceu ativa durante todos os testes de foto.

## Casos de teste — exclusão de conta

> Use uma conta de teste. Não execute este fluxo inicialmente com a conta principal usada no desenvolvimento.

| Caso | Resultado |
|---|---|
| Cancelar a primeira confirmação | ⏳ Pendente |
| Digitar texto diferente de `EXCLUIR` e preservar conta | ⏳ Pendente |
| Confirmar `EXCLUIR` em conta de teste | ⏳ Pendente |
| `profiles.ativo = false` | ⏳ Pendente |
| `profiles.excluido_em` preenchido | ⏳ Pendente |
| Endereços ativos da conta ficam desativados | ⏳ Pendente |
| Loja pertencente à conta fica inativa | ⏳ Pendente |
| Pedidos/histórico permanecem no banco | ⏳ Pendente |
| Sessão é encerrada | ⏳ Pendente |
| Novo login com a conta excluída é bloqueado no site | ⏳ Pendente |

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

⏳ A **exclusão de conta por soft delete** continua pendente de teste funcional com uma conta descartável.

## Critério para concluir o RF-04

O RF-04 pode ser marcado como totalmente concluído quando o fluxo funcional de exclusão de conta for aprovado. O subfluxo de múltiplos endereços e o fluxo principal de foto de perfil já foram validados.
