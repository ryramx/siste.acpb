# Matriz de RBAC — ACPB

Documento de referência para a tarefa 11. Os perfis e permissões já existiam cadastrados no banco
(6 perfis, 29 permissões), mas sem nenhum vínculo em `perfil_permissoes`. Esta matriz define os
vínculos aplicados pela migration de seed e implementados em `app/api/deps.py::require_permission`.

## Convenção de nomes

Cada permissão é identificada como `modulo.acao` (colunas `permissoes.modulo` e `permissoes.acao`).
Módulos sem uma permissão própria reaproveitam a permissão do módulo mais próximo:

- `cargos` (metadados de `Membro`) usa as permissões de `membros`.
- `contas_financeiras`, `categorias_financeiras` e `movimentacoes_financeiras` usam as permissões
  de `financeiro`.
- `atendimentos` (histórico de atendimento de beneficiários) usa as permissões de `beneficiarios`.
- `dashboard` não exige permissão própria — qualquer usuário autenticado e ativo pode visualizá-lo
  (é um resumo agregado, sem dado sensível individual).
- Módulos sem permissão de `excluir` cadastrada (todos exceto `pessoas`) reaproveitam a permissão
  de `editar` para a operação de exclusão (`DELETE`), já que o schema atual não tem uma ação
  dedicada — reavaliar se o negócio precisar diferenciar as duas ações no futuro.

## Matriz perfil × permissão

| Perfil | Acesso |
|---|---|
| **Administrador** | Todas as 29 permissões — inclui `usuarios.*` e `auditoria.visualizar`, exclusivos deste perfil. |
| **Gestor** | Visualizar/criar/editar em `pessoas`, `membros`, `voluntarios`, `beneficiarios`, `projetos`, `eventos`, `inscricoes`, `financeiro`. Sem `usuarios.*`, sem `auditoria.visualizar`, sem `pessoas.excluir`. |
| **Secretário** | Visualizar/criar/editar em `pessoas`, `membros`, `voluntarios`, `beneficiarios`, `eventos`, `inscricoes`. Apenas `projetos.visualizar` (não edita projetos). Sem `financeiro`, `usuarios`, `auditoria`, `pessoas.excluir`. |
| **Financeiro** | Visualizar/criar/editar em `financeiro`. Apenas visualizar em `pessoas`, `membros`, `voluntarios`, `beneficiarios`, `projetos` (para vincular responsáveis/categorias). Sem `usuarios`, `auditoria`, `eventos`, `inscricoes`. |
| **Coordenador** | Visualizar/criar/editar em `projetos`, `eventos`, `inscricoes`, `voluntarios`. Apenas visualizar em `pessoas`, `membros`, `beneficiarios`. Sem `financeiro`, `usuarios`, `auditoria`. |
| **Voluntário** | Apenas `eventos.visualizar`, `projetos.visualizar`, `inscricoes.visualizar`, `inscricoes.criar` (autoinscrição em eventos). Sem acesso a cadastros de pessoas/beneficiários/financeiro. |

## Módulo de patrimônio (tarefa 23)

Permissões `patrimonio.visualizar`, `patrimonio.criar` e `patrimonio.editar`, semeadas pela
migration `8c8e37a26f1d` (idempotente, como o seed original do RBAC).

| Perfil | Acesso ao patrimônio |
|---|---|
| **Administrador** | Visualizar, criar e editar |
| **Gestor** | Visualizar, criar e editar — é o perfil de gestão operacional |
| **Financeiro** | Apenas visualizar: o valor de aquisição dos bens é informação patrimonial relevante para o financeiro, mas manter o cadastro não é atribuição dele |
| Demais perfis | Sem acesso |

A exclusão de um bem exige `patrimonio.editar` (não há ação `excluir` dedicada), seguindo o mesmo
padrão de `projetos`. A interface recomenda usar o status `BAIXADO` em vez de excluir, para
preservar o histórico.

## Dados sensíveis de beneficiários

Beneficiários carregam dados socioeconômicos sensíveis (renda familiar, composição familiar,
necessidades, situação socioeconômica). Além da permissão de módulo (`beneficiarios.visualizar`),
a tarefa 39 (privacidade) deve avaliar mascarar ou omitir esses campos para perfis que só precisam
saber que a pessoa é beneficiária (ex.: Voluntário, que hoje nem tem `beneficiarios.visualizar`).
Por ora, a barreira aplicada é a de módulo: quem não tem `beneficiarios.visualizar` não acessa o
recurso; quem tem, vê o registro completo.

## Regra de negação

Usuário sem a permissão exigida recebe **403 Forbidden**. Usuário sem token válido continua
recebendo **401** (tarefa 10). Um perfil inativo (`perfis.ativo=false`) ou uma permissão inativa
(`permissoes.ativo=false`) não conta para a checagem, mesmo que o vínculo em `perfil_permissoes`
exista.
