# Inventário de relacionamentos do banco — ACPB

Documento de referência para as tarefas 01–04 de `tarefas_pendentes/`. Lista cada coluna `*_id`
existente nos models, sua tabela de destino, cardinalidade, nulidade, regra de exclusão (`ON DELETE`)
e unicidade.

> **Importante:** o banco de dados `acpb_db` já existia com um schema completo e dados reais quando
> este inventário foi revisado (havia registros em praticamente todas as tabelas). Por isso a matriz
> abaixo reflete o schema **físico real** (consultado via `information_schema` e `pg_indexes`), não
> apenas o desenho teórico do DER. Isso corrigiu três suposições iniciais erradas: (1) `membros`,
> `voluntarios` e `beneficiarios` têm **uma linha única por pessoa** (não múltiplas); (2)
> `movimentacoes_financeiras.responsavel_id` referencia `pessoas`, não `usuarios`; (3) todas as FKs
> usam `ON DELETE NO ACTION` (equivalente a bloquear a exclusão quando há filhos), não CASCADE/SET NULL.
> A tabela `atendimentos` também já existia fisicamente e foi mapeada agora (model `Atendimento`)
> para não ser removida por engano por uma migration autogerada; seus schemas/rotas seguem sendo
> entregues na tarefa 19.

| Coluna (tabela) | Referencia | Cardinalidade | Nulo? | ON DELETE (real) | Unicidade (real) |
|---|---|---|---|---|---|
| `membros.pessoa_id` | `pessoas.id` | 1:1 | não | NO ACTION | **sim** (`uq_membro_pessoa`) |
| `membros.cargo_id` | `cargos.id` | N:1 | não | NO ACTION | não |
| `voluntarios.pessoa_id` | `pessoas.id` | 1:1 | não | NO ACTION | **sim** (`uq_voluntario_pessoa`) |
| `beneficiarios.pessoa_id` | `pessoas.id` | 1:1 | não | NO ACTION | **sim** (`uq_beneficiario_pessoa`) |
| `atendimentos.beneficiario_id` | `beneficiarios.id` | N:1 | não | NO ACTION | não |
| `atendimentos.responsavel_id` | `pessoas.id` | N:1 | não | NO ACTION | não |
| `telefones.pessoa_id` | `pessoas.id` | N:1 | não | NO ACTION | não (regra de "no máximo 1 principal" aplicada via índice único parcial `principal = true`, criado agora — não existia antes) |
| `usuarios.pessoa_id` | `pessoas.id` | 1:1 | não | NO ACTION | **sim** |
| `usuarios.email` | — | — | não | — | **sim** |
| `cargos.nome` / `perfis.nome` / `permissoes.nome` / `categorias_financeiras.nome` | — | — | não | — | **sim** |
| `usuario_perfis.usuario_id` | `usuarios.id` | N:1 | não | NO ACTION | par único com `perfil_id` |
| `usuario_perfis.perfil_id` | `perfis.id` | N:1 | não | NO ACTION | par único com `usuario_id` |
| `perfil_permissoes.perfil_id` | `perfis.id` | N:1 | não | NO ACTION | par único com `permissao_id` |
| `perfil_permissoes.permissao_id` | `permissoes.id` | N:1 | não | NO ACTION | par único com `perfil_id` |
| `projetos.responsavel_id` | `pessoas.id` | N:1 | sim | NO ACTION | não |
| `eventos.responsavel_id` | `pessoas.id` | N:1 | sim | NO ACTION | não |
| `eventos.projeto_id` | `projetos.id` | N:1 | sim | NO ACTION | não |
| `inscricoes.pessoa_id` | `pessoas.id` | N:1 | não | NO ACTION | par único com `evento_id` |
| `inscricoes.evento_id` | `eventos.id` | N:1 | não | NO ACTION | par único com `pessoa_id` |
| `projeto_voluntarios.projeto_id` | `projetos.id` | N:1 | não | NO ACTION | par único com `voluntario_id` |
| `projeto_voluntarios.voluntario_id` | `voluntarios.id` | N:1 | não | NO ACTION | par único com `projeto_id` |
| `movimentacoes_financeiras.conta_financeira_id` | `contas_financeiras.id` | N:1 | não | NO ACTION | não |
| `movimentacoes_financeiras.categoria_id` | `categorias_financeiras.id` | N:1 | não | NO ACTION | não |
| `movimentacoes_financeiras.projeto_id` | `projetos.id` | N:1 | sim | NO ACTION | não |
| `movimentacoes_financeiras.responsavel_id` | `pessoas.id` | N:1 | não | NO ACTION | não |
| `auditoria.usuario_id` | `usuarios.id` | N:1 | sim | NO ACTION | não |

## Decisão sobre `ON DELETE`

O schema físico usa `NO ACTION` (equivalente, na prática, a bloquear a exclusão do pai enquanto
existirem filhos) em **todas** as FKs. Os models SQLAlchemy foram alinhados a essa realidade — nenhuma
`ForeignKey` declara `ondelete=`, preservando o comportamento já em produção e evitando uma migration
que alteraria regras de integridade silenciosamente. Onde faz sentido no nível de aplicação (ex.:
excluir uma Pessoa também deve remover seus Telefones, excluir um Evento remove suas Inscrições), o
cascade é feito no **ORM** (`cascade="all, delete-orphan"` em `Pessoa.telefones` e `Evento.inscricoes`),
não no banco — a app decide a ordem de remoção antes do DELETE físico, sem mudar a constraint real.

## Registros críticos com preferência por inativação

Por política definida na tarefa 15 (auditoria), os seguintes registros devem preferir campos de
inativação/cancelamento (`ativo`, `status`, `data_saida`, etc.) em vez de exclusão física: `usuarios`,
`membros`, `voluntarios`, `beneficiarios`, `movimentacoes_financeiras`, `perfis`, `permissoes`.
