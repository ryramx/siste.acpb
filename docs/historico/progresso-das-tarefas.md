# Progresso das tarefas — Sistema ACPB

Este arquivo é atualizado a cada tarefa concluída (ou parcialmente concluída) das pastas `tarefas_pendentes/`. Serve como registro histórico do que já foi implantado no sistema.

Legenda: `Concluído` | `Em andamento` | `Pendente`

## Achado pós-entrega (teste manual em tela, fora desta sessão de execução)

Ao testar o login pela primeira vez em navegador de verdade, apareceu o erro "value is not a valid
email address: ... special-use or reserved name" para `admin@acpb.local` / `joao@acpb.local`. Causa:
`LoginRequest.email` e `UsuarioCreate/Update.email` usavam `EmailStr` do Pydantic, que rejeita
domínios de uso especial (RFC 6761) como `.local` — exatamente o domínio usado nos e-mails
institucionais/seed deste projeto. Isso bloquearia o login de **qualquer** usuário real do sistema.
Corrigido trocando `EmailStr` por validação de formato simples (regex `algo@algo.algo`) em
`app/schemas/auth.py` e `app/schemas/usuario.py`; teste de regressão adicionado em
`tests/test_auth.py::test_login_com_email_de_dominio_local_funciona`. Suíte completa: 81/81 passando.

## Fase 1 — Banco e migrações

- Tarefa 01 - Inventariar relacionamentos do banco - "Concluído" (ver `backend/RELACIONAMENTOS.md`)
- Tarefa 02 - Registrar todos os models no SQLAlchemy - "Concluído" (`app/models/__init__.py` importa os 19 models; `alembic/env.py` importa `app.models`; teste `tests/test_models.py`)
- Tarefa 03 - Adicionar chaves estrangeiras e restrições - "Concluído" (FKs com `ondelete` conforme `backend/RELACIONAMENTOS.md`; `UniqueConstraint` em `usuario_perfis`, `perfil_permissoes`, `inscricoes`, `projeto_voluntarios`; índice único parcial de telefone principal por pessoa)
- Tarefa 04 - Adicionar relacionamentos ORM - "Concluído" (`relationship()`/`back_populates` cobrindo Pessoa↔Membro/Voluntário/Beneficiário/Telefone/Usuário, Projeto↔Eventos/Movimentações/Voluntários, Evento↔Inscrições; `configure_mappers()` validado sem ambiguidade)
- Tarefa 05 - Gerar e aplicar a migration inicial - "Concluído" — **achado importante:** o banco `acpb_db` já existia com dados reais e schema completo (inclusive tabela `atendimentos` não mapeada, agora coberta pelo model `Atendimento`). Fluxo aplicado: (1) backup via `pg_dump` em `backend/backups/` (fora do git); (2) inventário corrigido em `backend/RELACIONAMENTOS.md` para refletir a realidade física (não as suposições iniciais); (3) migration baseline `fde3b921d4fc` gerada e validada de ponta a ponta (upgrade/downgrade) contra um schema Postgres vazio isolado; (4) no banco real, o único item realmente novo (índice único parcial de telefone principal) foi criado de fato, e a migration foi marcada como aplicada com `alembic stamp head` (sem recriar tabelas já existentes); (5) `alembic check` confirma zero divergência entre models e banco
- Tarefa 06 - Atualizar README do backend - "Concluído" (removida a informação de que não havia models/tabelas; documentados models, migrations, `alembic check`, backups e link para `RELACIONAMENTOS.md`)

## Fase 2 — Segurança, acesso e auditoria

- Tarefa 07 - Definir política de autenticação - "Concluído" (decisões em `backend/AUTENTICACAO.md`: JWT HS256, access token único de 8h sem refresh, logout client-side, reset de senha com token de uso único de 30min, checagem de usuário ativo em tempo real; configuração em `app/core/config.py` com validação que impede subir em produção sem `JWT_SECRET_KEY`; variáveis documentadas em `.env.example`)
- Tarefa 08 - Implementar hash de senha - "Concluído" (`app/core/security.py` com `hash_password`/`verify_password` via `pwdlib`/Argon2; `UsuarioCreate`/`UsuarioAlterarSenha` recebem `senha` em texto puro só de entrada, nunca `senha_hash`; `UsuarioResponse` não expõe `senha_hash` — coberto por `tests/test_security.py`)
- Tarefa 09 - Implementar login JWT - "Concluído" (`POST /auth/login` valida credenciais e usuário ativo, emite JWT via `create_access_token`, atualiza `ultimo_login`; `POST /auth/logout` documentado como stateless conforme política; mensagens de erro genéricas para não vazar se o e-mail existe; `get_db` centralizado em `app/db/session.py`; testes em `tests/test_auth.py` cobrindo sucesso, senha errada, e-mail inexistente e usuário inativo)
- Tarefa 10 - Proteger rotas com usuário atual - "Concluído" (`app/api/deps.py::get_current_user` valida Bearer token, checa usuário ativo em tempo real no banco; todos os routers de negócio em `main.py` protegidos via `dependencies=[Depends(get_current_user)]`; apenas `/auth/*` e `/health/*` continuam públicos; esquema `Bearer401` garante 401 — não 403 — quando o header está ausente; testes em `tests/test_protected_routes.py`)
- Tarefa 11 - Implementar RBAC no backend - "Concluído" — **achado importante:** os 6 perfis e 29 permissões já existiam no banco, mas `perfil_permissoes` estava totalmente vazio (nenhum perfil tinha qualquer permissão vinculada). Matriz definida e documentada em `backend/RBAC.md`; migration de seed idempotente `b2678833e3bc` popula os vínculos (99 ao todo) tanto no banco existente quanto em instalações novas; `require_permission("modulo.acao")` em `app/api/deps.py` resolve permissões via perfis ativos do usuário e aplica 403 quando ausente; aplicado em todas as rotas de negócio (`pessoas`, `cargos`, `membros`, `voluntarios`, `beneficiarios`, `projetos`, `eventos`, `inscricoes`, financeiro); `dashboard` deliberadamente sem permissão de módulo (só autenticação); testes em `tests/test_rbac.py`
- Tarefa 12 - CRUD de usuários (admin) - "Concluído" (`app/api/routes/usuarios.py`: criar/listar/consultar/editar protegidos por `usuarios.*`; `POST /usuarios/{id}/desativar` em vez de exclusão física, preservando histórico; `UsuarioResponse` nunca retorna hash; testes em `tests/test_usuarios.py`)
- Tarefa 13 - CRUD de perfis, permissões e vínculos - "Concluído" (`app/api/routes/perfis.py` e `permissoes.py` para CRUD; vínculos perfil↔permissão em `perfis.py` e usuário↔perfil em `usuarios.py`; duplicidade tratada via `UniqueConstraint`/`IntegrityError`→400; bloqueios de segurança: não desativa perfil Administrador, não remove permissão do Administrador, não remove o último usuário administrador ativo — todos retornam 409; testes em `tests/test_rbac_admin.py`)
- Tarefa 14 - Recuperação de senha - "Concluído" (nova tabela `senha_reset_tokens` — model + migration `f69c63fa7214`; token de uso único (32 bytes aleatórios) com apenas o hash SHA-256 persistido, expiração de 30min; `POST /auth/recuperar-senha` sempre responde 202 genérico (não revela se e-mail existe), token é logado — integração de provedor de e-mail fica para quando houver um configurado; `POST /auth/redefinir-senha` valida expiração/reuso e troca a senha; testes em `tests/test_recuperacao_senha.py` cobrindo sucesso, reuso, expiração e token inválido)
- Tarefa 15 - Auditoria automática e consulta - "Concluído" (`app/core/auditoria.py` com `registrar_auditoria`/`model_to_dict` — nunca serializa `senha_hash`/`token_hash`; instrumentado em `usuarios`, `perfis` (e vínculos com permissões), `movimentacoes_financeiras` e exclusão de `pessoas`, capturando ator, ação, tabela, registro, dados antes/depois e IP; `GET /auditoria` filtrável por usuário/tabela/ação/período, restrito a `auditoria.visualizar` (só Administrador); **achado**: a FK `NO ACTION` de `auditoria.usuario_id` bloqueia a exclusão física de um usuário que já atuou como ator em algum evento — confirma na prática a política de preferir inativação; testes em `tests/test_auditoria.py`)

## Fase 3 — Cadastros e integrações de domínio

- Tarefa 16 - CRUD de telefones - "Concluído" (`app/api/routes/telefones.py`; schema valida formato — 10/11 dígitos, normaliza formatação, tipo em lista fechada; marcar um telefone como principal desmarca automaticamente o anterior da mesma pessoa, reforçado pelo índice único parcial do banco; testes em `tests/test_telefones.py`)
- Tarefa 17 - Cadastro transacional de Pessoa e vínculos - "Concluído" (`POST /cadastros/pessoa-vinculo` cria ou reaproveita Pessoa (`pessoa_id` xor `pessoa`) e cria Membro/Voluntário/Beneficiário na mesma transação — falha no vínculo desfaz a Pessoa recém-criada via rollback; `GET /cadastros/pessoa/{id}/papeis` lista todos os papéis de uma pessoa; permissão dupla exigida (pessoas.criar + papel.criar); testes em `tests/test_cadastro_pessoa.py`)
- Tarefa 18 - Validar referências nas rotas existentes - "Concluído" (`app/core/erros.py::tratar_integrity_error` traduz `UniqueViolation`→409 e `ForeignKeyViolation`→400 como rede de segurança em todos os CRUDs; validação explícita de FK com 404 específico adicionada em `membros`, `voluntarios`, `beneficiarios`, `inscricoes`, `eventos`, `projetos` e `movimentacoes_financeiras`; testes em `tests/test_validacao_referencias.py` confirmando que nenhum caso vaza 500)
- Tarefa 19 - Modelar registro de atendimentos - "Concluído" (model `Atendimento` já existia desde a Fase 1 para proteger a tabela real; adicionados schemas e CRUD em `app/api/routes/atendimentos.py`, filtrável por beneficiário, reaproveitando as permissões de `beneficiarios` — acesso sensível restrito a quem já vê beneficiários; testes em `tests/test_atendimentos.py`)
- Tarefa 20 - Modelar anexos financeiros - "Concluído" (provider inicial: sistema de arquivos local em `backend/storage/anexos_financeiros/` — fora do git; nova tabela `anexos_financeiros` — model + migration `4beefe74b866`; upload valida tipo MIME em lista fechada (pdf/png/jpeg) e tamanho máximo 5MB, nome armazenado sempre gerado via `uuid4` — nunca o nome enviado pelo usuário; download só via `GET /anexos-financeiros/{id}/download` autenticado, nada exposto como estático; upload/exclusão auditados; testes em `tests/test_anexos_financeiros.py`)
- Tarefa 21 - Dashboard financeiro API - "Concluído" (novos endpoints em `app/api/routes/dashboard.py`: `/financeiro/resumo-periodo`, `/financeiro/por-categoria`, `/financeiro/evolucao` (mensal), `/financeiro/despesas-por-projeto`, todos filtráveis por `data_inicio`/`data_fim` e restritos a `financeiro.visualizar`; `/resumo` geral mantido público a qualquer autenticado; testes em `tests/test_dashboard_financeiro.py`)
- Tarefa 22 - Relatórios e exportações - "Concluído" (escopo inicial: financeiro, pessoas, projetos e eventos, cada um em CSV/Excel/PDF via `app/core/relatorios.py` — `openpyxl` e `reportlab`; `GET /relatorios/{financeiro,pessoas,projetos,eventos}?formato=csv|xlsx|pdf` com filtros por período/status e autorização por módulo (reaproveita as permissões `*.visualizar`); testes em `tests/test_relatorios.py` cobrindo os 3 formatos e autorização)
- Tarefa 23 - Modelar patrimônio - "Concluído" (ver seção "Módulo de Patrimônio" ao final deste arquivo)
- Tarefa 24 - FUTURO: Modelar estoque - "Pendente" (idem — FUTURO, fora do escopo inicial)
- Tarefa 25 - FUTURO: Modelar doações - "Pendente" (idem — FUTURO, fora do escopo inicial)

## Fase 4 — Frontend e experiência

- Tarefa 26 - Ampliar cliente de API do frontend - "Concluído" (`src/services/apiClient.ts` reescrito com `get/post/put/patch/delete`, serialização JSON, tratamento uniforme de erro via `ApiError` — inclusive parsing de erros de validação do Pydantic —, header `Authorization: Bearer` obtido de `src/services/session.ts`, e hook `setOnUnauthorized` para a tarefa 27 reagir a 401; `apiGet` isolado removido, único consumidor migrado em `domainServices.ts`)
- Tarefa 27 - Integrar autenticação real no frontend - "Concluído" — backend ganhou `GET /auth/me` (não existia) para o frontend obter usuário+permissões pós-login; `authService.ts` chama `/auth/login` real e mapeia as permissões `modulo.acao` do backend para as chaves de UI (`view_members`, `edit_financial`, etc.); `AuthContext` reage a 401 via `setOnUnauthorized` (logout automático); removido o "Admin padrão" implícito e o seletor de perfis mock no `Topbar`/`Login`; sessão persiste entre refreshes enquanto o token for válido, nunca por padrão; validado end-to-end via curl simulando exatamente as chamadas do frontend (login → me → rota protegida sem token → recuperação de senha) e `npm run build` limpo — sem navegador disponível neste ambiente para teste visual manual
- Tarefa 28 - Integrar serviço de membros - "Concluído" — `memberService` em `domainServices.ts` reescrito para usar Pessoa+Membro (via `/cadastros/pessoa-vinculo`) e telefones reais; troquei o conceito fictício de "projeto do membro" (não existe no backend) por "Cargo" real via `/cargos/`; "excluir" mapeado para desativação (`PUT ativo:false`), consistente com a política do backend de preservar histórico; adicionada rota `/membros/:id/editar` (antes o botão "Editar" nem navegava corretamente); tipo `Member` e telas (`MembersList`, `MemberDetails`, `MemberForm`) ajustados para remover campos que não existem no backend (projeto, responsável legal, menor de idade); validado via `tsc`/`npm run build` limpos e teste end-to-end via curl replicando exatamente as chamadas do frontend (criar → telefone → listar → editar → desativar) — sem navegador disponível neste ambiente para teste visual manual
- Tarefa 29 - Integrar voluntários e beneficiários - "Concluído" — **bug crítico encontrado e corrigido durante o teste end-to-end:** quase todas as rotas de domínio (`cargos`, `voluntarios`, `beneficiarios`, `projetos`, `eventos`, `inscricoes`, `movimentacoes_financeiras`, `contas_financeiras`, `categorias_financeiras`, `membros`) não preenchiam `created_at`/`updated_at` ao criar registros — qualquer POST direto (fora do fluxo `/cadastros/pessoa-vinculo`) falhava com violação de NOT NULL; os testes anteriores nunca pegaram isso porque só testavam FK inválida (404), nunca uma criação bem-sucedida. Corrigido em todas as rotas afetadas; teste de regressão `tests/test_criacao_com_timestamps.py` trava o comportamento correto. `volunteerService`/`beneficiaryService` reescritos com dados reais (telefone principal, atendimentos via `/atendimentos/`); `Volunteer`/`Beneficiary`/`AttendanceRecord` tiveram campos fictícios (projeto vinculado, horas trabalhadas, dias disponíveis) removidos por não existirem no backend; `BeneficiaryDetails` usa `user.pessoaId` real como responsável do atendimento; validado via `tsc`/build limpos e teste end-to-end via curl (criar beneficiário → atendimento → voluntário → consultas)
- Tarefa 30 - Integrar projetos, eventos e inscrições - "Concluído" — **outro bug real encontrado durante o teste end-to-end:** `GET /inscricoes/` ignorava por completo os filtros e sempre retornava todas as inscrições do sistema, o que faria a tela de inscrições de um evento mostrar inscritos de outros eventos; corrigido com filtros `evento_id`/`pessoa_id`, travado por `tests/test_inscricoes_filtro.py`. `projectService`/`eventService` reescritos com dados reais (`responsibleName` resolvido via Pessoa, `eventsCount` e `totalExpenses` derivados de `/eventos/` e `/dashboard/financeiro/despesas-por-projeto`); campos sem correspondência real no backend removidos (`beneficiariesCount`/`volunteersCount` de Projeto, `categoria`/`availableDays` de Evento) em vez de manter contadores fictícios; `inscricaoService.criar` adicionado; validado via `tsc`/build limpos e teste end-to-end via curl (criar projeto → evento → inscrição → listar filtrado)
- Tarefa 31 - Integrar financeiro e anexos - "Concluído" — `financialService` reescrito para usar contas/categorias financeiras reais (não mais um enum fixo de categorias no frontend); as 4 telas (`FinancialDashboard`, `ReceitasPage`, `DespesasPage`, `MovimentacoesPage`) migradas para status real (`CONFIRMADA`/`PENDENTE`, não mais `PAGO` fictício) e para selects de Conta/Categoria carregados da API; gráfico de "receitas/despesas por categoria" no dashboard financeiro, antes com percentuais 100% inventados no código, agora agregado a partir dos lançamentos reais; `responsavel_id` do lançamento é sempre o `pessoaId` do usuário logado; contagem de anexos exibida via `/anexos-financeiros/` (upload/download completos desde a tarefa 20; uma tela dedicada de gestão de anexos por lançamento fica como próximo passo, não incluída nesta rodada); validado via `tsc`/build limpos e teste end-to-end via curl (contas → categorias → criar despesa → listar)
- Tarefa 32 - Integrar dashboard geral - "Concluído" (`Dashboard.tsx` reescrito usando `GET /dashboard/resumo` real e a lista real de eventos futuros via `eventService`; removidos o alerta institucional fictício sobre um projeto específico e a lista de "atividades recentes" com nomes/ações inventados — nenhum dado fabricado permanece na tela; estados de carregamento e erro com retry adicionados; `tsc`/`npm run build` limpos)
- Tarefa 33 - Criar calendário de eventos - "Concluído" (`EventsList.tsx` reescrito com visualizações mensal, semanal, diária e em lista, todas a partir da API real de eventos; navegação por período (anterior/próximo/hoje) com cálculo real de dias do mês e offset de dia da semana — antes o calendário era uma grade estática fixa de "Setembro 2026" com 30 dias e botões de navegação que não faziam nada; `tsc`/build limpos)
- Tarefa 34 - Revisar responsividade e acessibilidade - "Concluído" (revisão de código, sem navegador disponível neste ambiente para teste visual manual) — 3 tabelas sem wrapper `overflow-x-auto` corrigidas (`FinancialDashboard`, `EventInscriptions`, `SettingsPage` — forçariam scroll horizontal da página inteira em telas estreitas); componente `Modal` compartilhado (usado em todo o app) ganhou `role="dialog"`/`aria-modal`/`aria-labelledby`, fechar com tecla Esc, fechar ao clicar no fundo, e `aria-label` no botão de fechar — antes não tinha nenhum desses; adicionado `aria-label`/`aria-expanded` em todos os botões icon-only sem rótulo acessível encontrados (menu mobile, notificações, perfil, colapsar/fechar sidebar, sair); imagens já tinham `alt`; `tsc`/build limpos)

## Fase 5 — Qualidade e operação

- Tarefa 35 - Ampliar testes automatizados - "Concluído" (backend: 74 testes cobrindo models/migrations, CRUDs, FKs, auth/JWT, RBAC, auditoria e exportações, construídos ao longo das Fases 1-4 — não pré-existiam antes desta sessão; frontend: framework de testes configurado do zero com Vitest/jsdom (`npm test`), com 17 testes cobrindo os fluxos críticos de `session.ts`, `authService.hasPermission` e `apiClient` — inclusive tratamento de 401 e parsing de erros de validação do Pydantic. **Ressalva:** os testes de backend usam o banco de desenvolvimento real com fixtures de criação/limpeza manual, não um banco de testes isolado dedicado — recomenda-se configurar um banco separado (`acpb_db_test`) como melhoria futura)
- Tarefa 36 - Definir backup e restauração - "Concluído" (política documentada em `backend/BACKUP_E_RESTAURACAO.md`: periodicidade diária/semanal/mensal com retenção de até 24 meses para lançamentos financeiros, criptografia em repouso e trânsito, regra 3-2-1 de armazenamento, responsável nomeado, alertas de falha e teste de restauração trimestral obrigatório; automação real de infraestrutura fica fora do escopo deste repositório)
- Tarefa 37 - Revisar CORS e configuração de produção - "Concluído" (`app/core/config.py` agora falha ao subir em `ENVIRONMENT=production` se `JWT_SECRET_KEY`, `DATABASE_PASSWORD` estiverem vazios ou `BACKEND_CORS_ORIGINS` estiver vazio/contendo `*` — antes só validava o JWT; decisões documentadas em `backend/CORS_E_PRODUCAO.md`, incluindo por que cookies/CSRF não se aplicam aqui — autenticação é via Bearer token, não cookie; testes em `tests/test_config_producao.py`)
- Tarefa 38 - Documentar deploy e operação - "Concluído" (`backend/DEPLOY.md`: build backend/frontend, ordem migrations-antes-do-deploy, variáveis obrigatórias, health checks como liveness/readiness probe, estratégia de logs, rollback de código e de migration, referência a backup e monitoramento mínimo)
- Tarefa 39 - Revisar privacidade e retenção de dados - "Concluído" (`backend/PRIVACIDADE_E_RETENCAO.md`: classificação de dados pessoais/sensíveis, inventário do que já reduz exposição em respostas/logs — nenhum `senha_hash`/token exposto, erros 500 não vazam detalhe técnico —, acesso a beneficiários mapeado ao RBAC existente com gap conhecido registrado — permissão granular para campos socioeconômicos ainda não existe —, política de retenção/exclusão por tipo de dado, e o que fica como decisão da associação, não do código)

## Fase 6 — Funcionalidades futuras (fora do escopo inicial, aguardando decisão)

- Tarefa 40 - FUTURO: Comunicação interna - "Pendente"
- Tarefa 41 - FUTURO: Recursos avançados de eventos - "Pendente"
- Tarefa 42 - FUTURO: Recursos avançados operacionais - "Pendente"

## Pós-entrega — Foto de perfil (Pessoa) - "Concluído"

Pedido do usuário, fora do fluxo de fases original: por padrão membros/voluntários/usuários não devem
ter foto nenhuma (removidas todas as fotos fictícias de banco de imagens Unsplash que estavam
hardcoded em `MembersList`, `MemberDetails`, `VolunteersList`, `Sidebar` e `Topbar`), e foi criada a
funcionalidade real de enviar/remover foto.

**Backend:** nova coluna `pessoas.foto_arquivo` (migration `2872188a448c`, nullable, única) + property
`Pessoa.tem_foto`; armazenamento em disco local via `app/core/foto_pessoa_storage.py` (mesmo padrão de
nome de arquivo gerado por uuid dos anexos financeiros — nunca confia em nome enviado pelo cliente),
limitado a PNG/JPEG e 2MB (`FOTOS_TAMANHO_MAXIMO_MB`); 3 endpoints em `pessoas.py`:
`POST/GET/DELETE /pessoas/{id}/foto`. **Decisão de autorização:** em vez de exigir `pessoas.editar`/
`pessoas.visualizar` (que voluntários/usuários comuns não têm, o que os impediria de gerenciar a
própria foto), essas 3 rotas usam `_autorizar_acesso_foto`: libera sempre quando `pessoa_id` da foto é
a própria pessoa do usuário logado, e cai para a permissão de `Pessoa` normal apenas quando é a foto
de **outra** pessoa. `tem_foto` também exposto em `PessoaResponse` e em `GET /auth/me`. Testes em
`tests/test_foto_pessoa.py` (7 casos, incluindo usuário sem nenhuma permissão gerenciando a própria
foto e sendo bloqueado na foto de terceiros). Suíte completa do backend: 88/88 passando.

**Frontend:** `apiClient` ganhou `postForm` (upload multipart sem setar Content-Type manualmente) e
`getBlob` (necessário porque `<img src>` não consegue enviar o header `Authorization` — a imagem é
buscada como blob autenticado e convertida via `URL.createObjectURL`). Componentes novos `Avatar`
(círculo com iniciais coloridas quando não há foto) e `AvatarUpload` (adiciona botões de
enviar/remover). `Member`/`Volunteer`/`AuthenticatedUser` perderam o campo fictício `photoUrl`/
`avatar` e ganharam `pessoaId`/`temFoto` reais. Aplicado em `MembersList`, `MemberDetails` (upload
liberado quando o usuário tem `edit_members`), `VolunteersList`, `Sidebar` e `Topbar` (aqui qualquer
usuário pode trocar a própria foto a partir do dropdown de perfil, refletido via novo
`AuthContext.updateUserPhotoStatus`). Também removida a `avatar` fictícia do `User`/`mocks/users.ts`
usado na tela de administração de usuários (ainda mock, integração real é tarefa futura separada).
Validado com `tsc --noEmit`, `npm run build` e `npx vitest run` (19/19) limpos — sem navegador
disponível neste ambiente para teste visual manual.

## Pós-entrega — Integração real da SettingsPage (Usuários, Perfis e Permissões) - "Concluído"

A `SettingsPage` (tela de administração RBAC) dependia 100% de `mocks/users.ts`. Nenhum endpoint
novo foi necessário — os endpoints de `usuarios.py`, `perfis.py` e `permissoes.py` já cobriam tudo
(listar/criar/desativar usuários, vincular/desvincular perfis, listar/vincular/desvincular
permissões de um perfil). Backend não foi alterado.

Novos arquivos no frontend: `types/settings.ts` (`SystemUser`, `SystemProfile`,
`SystemPermission`, `PessoaSemUsuario`), `services/settingsService.ts`
(`userManagementService`/`profileService`/`permissionService`, seguindo o mesmo padrão de
`domainServices.ts` — múltiplas chamadas via `apiClient` compostas no service, nunca `fetch()` nos
componentes), e a página foi dividida em `SettingsPage.tsx` (abas) +
`pages/settings/UsersManagement.tsx` + `pages/settings/ProfilesManagement.tsx`. `mocks/users.ts` e
o tipo `User`/`UserRole` (não usados em mais nenhum lugar) foram removidos.

Usuários: lista real com nome (via Pessoa), e-mail, perfis vinculados e status; criar usuário exige
selecionar uma Pessoa já cadastrada sem usuário (`POST /usuarios/` exige `pessoa_id` existente —
não é um bug, é a regra real do backend); ativar/desativar usa `POST /usuarios/{id}/desativar` para
desativar e `PUT /usuarios/{id}` com `ativo:true` para reativar (não existe endpoint dedicado de
reativação — não era necessário criar um). Perfis: lista real com toggle ativo/inativo (backend já
bloqueia desativar o perfil Administrador, refletido como toast de erro 409); modal de permissões
por perfil, com os checkboxes do perfil Administrador desabilitados na UI (o backend já bloqueia a
remoção, aqui só evitamos a tentativa inútil). Todas as ações são condicionadas a
`hasPermission('manage_users')` no frontend, mas a autorização real continua 100% no backend.
Testes novos em `services/settingsService.test.ts` (7 casos: orquestração de `getAll`, filtro de
pessoas sem usuário, escolha do endpoint certo em `setAtivo`, vínculo/desvínculo de perfil e
permissão, propagação de erros 403 e 409 como `ApiError`). Suíte completa do frontend: 26/26
passando; `tsc --noEmit` e `npm run build` limpos. Sem navegador disponível neste ambiente para
teste visual manual.

## Pós-entrega — Tela de Relatórios - "Concluído"

A API de relatórios existia desde a tarefa 22, mas não havia tela: os 4 relatórios só eram
alcançáveis via chamada direta ao endpoint. Nenhum endpoint novo foi necessário; backend não foi
alterado.

Novos arquivos: `services/reportService.ts` e `pages/reports/ReportsPage.tsx`, mais a rota
`/relatorios` e o item no `Sidebar`.

A tela expõe os 4 relatórios (financeiro, pessoas, projetos, eventos) em cartões, cada um com seus
filtros reais e seletor de formato (CSV/Excel/PDF). **Decisão de autorização:** a rota não exige
permissão — cada relatório é filtrado individualmente pela permissão do módulo que o endpoint
correspondente exige no backend (`financeiro.visualizar`, `pessoas.visualizar`, etc.), e quem não
pode ver nenhum recebe um estado vazio explicativo. Isso evita oferecer um download que resultaria
em 403. Foi preciso criar a chave de UI `view_people` → `pessoas.visualizar`, que não existia
(o cadastro de Pessoa é distinto de membros/voluntários/beneficiários).

**Achados durante a implementação:** (1) o filtro `tipo` do relatório financeiro recebe
`ENTRADA`/`SAIDA` — os valores realmente gravados no banco —, não `RECEITA`/`DESPESA`, que é apenas
como a UI financeira os rotula; confirmado consultando os valores distintos no banco de
desenvolvimento. (2) O status de projeto ficou como campo livre em vez de select, porque o backend
filtra com `ILIKE` sobre texto livre e um select fixo esconderia status cadastrados fora da lista
(hoje existem `ATIVO` e `PLANEJADO`); o campo traz esses exemplos como texto auxiliar.

O download usa `apiClient.getBlob` (a requisição precisa do header `Authorization`, que um link
comum não envia) e monta o nome do arquivo no cliente, já que o `Content-Disposition` do backend
não chega ao `<a download>` por esse caminho. Filtros vazios são descartados da query string —
enviar `?cidade=` faria o backend filtrar por string vazia em vez de não filtrar.

Testes em `services/reportService.test.ts` (7 casos: montagem da query, descarte de filtros vazios,
escape de caracteres especiais, nome do arquivo, chamada ao endpoint correto com disparo do
download e propagação de erro). Suíte do frontend: 34/34. `tsc --noEmit` e `npm run build` limpos.
Sem navegador disponível neste ambiente para teste visual manual.

## Pós-entrega — Tela de Auditoria - "Concluído"

`GET /auditoria` existe desde a tarefa 15, mas o histórico não era consultável pela interface.
Nenhum endpoint novo foi necessário; backend não foi alterado.

Novos arquivos: `services/auditService.ts` e `pages/audit/AuditPage.tsx`, mais a rota `/auditoria`
(protegida por `view_audit` → `auditoria.visualizar`, na prática só Administrador) e o item no
`Sidebar`.

A tela lista os registros com data/hora, ator, ação, tabela, registro e IP, filtrável por usuário,
ação, tabela e período. Um modal mostra `dados_anteriores` e `dados_novos` lado a lado (Antes /
Depois), que é o conteúdo que dá sentido ao registro. Os selects de ação e tabela usam os valores
realmente gravados por `app/core/auditoria.py` (criar/editar/excluir/desativar; usuarios, perfis,
usuario_perfis, perfil_permissoes, pessoas, movimentacoes_financeiras, anexos_financeiros),
levantados do código em vez de inventados.

**Decisões tomadas:**

- A auditoria guarda apenas `usuario_id`; o nome vem do cadastro de usuários, carregado em paralelo
  e resolvido por um mapa. Se essa chamada falhar, a tela **não** quebra — cai para `Usuário #id`,
  porque esconder a auditoria inteira por causa dos rótulos seria pior. Ator nulo é rotulado como
  "Sistema".
- `data_fim` é enviado como `T23:59:59`. O backend compara com `created_at`, que é datetime:
  mandar só a data significaria meia-noite e excluiria todo o último dia escolhido pelo usuário.
- Paginação por `limit`/`offset` (50 por página). O endpoint não retorna total de registros, então
  "Próxima" só é habilitada quando a página veio cheia — em vez de exibir uma contagem falsa.

Testes em `services/auditService.test.ts` (9 casos: montagem da query com padrões e paginação,
omissão de filtros vazios, expansão de `data_fim`, resolução de nome, fallback para id, ator nulo,
resiliência à falha do cadastro de usuários e propagação de 403). Suíte do frontend: 43/43.
`tsc --noEmit` e `npm run build` limpos. Sem navegador disponível neste ambiente para teste visual
manual.

## Módulo de Patrimônio (tarefa 23) - "Concluído"

Primeiro dos três módulos que faltavam. Implementado de ponta a ponta: banco, API e tela.

**Backend:** model `Patrimonio` (tabela `patrimonios`) com código, nome, categoria, data e valor de
aquisição, local, responsável, status e observações. Migration `8c8e37a26f1d` cria a tabela e semeia
as 3 permissões do módulo (`patrimonio.visualizar/criar/editar`) com os vínculos de perfil,
idempotente via `ON CONFLICT DO NOTHING` como o seed original do RBAC. Validada de ponta a ponta:
upgrade, downgrade (tabela e permissões removidas) e upgrade de novo; `alembic check` sem
divergência.

**Decisões de modelagem:**

- `codigo` é único: é por ele que a associação identifica o bem fisicamente, e duplicar significaria
  dois cadastros do mesmo bem. Violação vira 409, não 500.
- `status` é lista fechada (`ATIVO`, `EM_MANUTENCAO`, `BAIXADO`, `EMPRESTADO`), validada no schema —
  diferente de `projetos`, onde o status é texto livre. Aqui os filtros e o acompanhamento dependem
  de o valor ser previsível.
- `responsavel_id` é nullable e sem cascata: excluir uma pessoa não pode apagar o registro do bem.
- CRUD auditado (criar/editar/excluir) como o financeiro, por ser patrimônio da associação.

**Autorização:** Administrador e Gestor administram; Financeiro apenas consulta (o valor de
aquisição interessa ao financeiro, mas manter o cadastro não é atribuição dele). Documentado em
`backend/RBAC.md`.

**Frontend:** `types/patrimonio.ts`, `services/patrimonioService.ts`, `pages/assets/AssetsList.tsx`,
rota `/patrimonio` (permissão `view_assets`) e item no `Sidebar`. Lista com busca local, filtro de
status no backend, totalizador de valor, e modais de criação/edição e de exclusão. Os botões de
escrita só aparecem com `edit_assets` — a autorização real continua no backend. O diálogo de
exclusão recomenda usar o status "Baixado" em vez de excluir, para preservar histórico.

**Achado:** `Numeric` do Postgres chega ao frontend como **string** (para não perder precisão), não
como número — o serviço converte explicitamente, senão o totalizador concatenaria texto em vez de
somar. Coberto por teste.

Testes: `backend/tests/test_patrimonios.py` (9 casos: CRUD, código duplicado → 409, status inválido
→ 422, valor negativo → 422, responsável inexistente → 404, filtros, auditoria, 403 para perfil sem
permissão, 401 sem token) e `src/services/patrimonioService.test.ts` (8 casos). Backend: 97/97.
Frontend: 52/52. `tsc` e `npm run build` limpos. Sem navegador disponível para teste visual manual.

## Cinco lacunas fechadas depois de uma revisão do que faltava - "Concluído"

Rodada nascida de uma pergunta ("o que está faltando para esse sistema?") e da leitura do
repositório em busca da resposta. Cinco itens, na ordem de risco/esforço em que foram atacados.

### 1. Limite de tentativas no login e na recuperação de senha

`/auth/login` e `/auth/recuperar-senha` eram as únicas rotas sem token e aceitavam tentativas
ilimitadas. Duas consequências: força bruta contra qualquer senha fraca — com CPF e dados
socioeconômicos de beneficiários atrás da conta — e o uso da recuperação para inundar a caixa de um
usuário e **queimar a cota de 300 e-mails/dia da Brevo**, o que derrubaria a recuperação de senha de
todos até o dia seguinte.

Implementado em `app/core/rate_limit.py` (janela deslizante em memória, sem dependência nova) com
dois limites por rota, porque contêm ataques diferentes: por e-mail pega quem martela uma conta de
vários lugares, por IP pega quem tenta poucas vezes em muitas contas. Números, decisões e as
limitações (contador por processo; um redeploy zera) estão documentados em `AUTENTICACAO.md`.

**Decisões:** o login conta só as falhas e o acerto zera a contagem, então quem sabe a senha nunca é
barrado; a recuperação conta todas as chamadas, porque de fora ela sempre "dá certo" e o custo a
conter é o e-mail enviado; e a recuperação **registra a tentativa antes de saber se o e-mail
existe**, senão o 429 viraria sinal de que a conta existe — a enumeração que a resposta idêntica
evita. O limite é checado antes de tocar no banco: o Argon2 é deliberadamente lento, e esse custo é
o que um ataque em volume transformaria em negação de serviço.

**Efeito colateral aceito:** cinco senhas erradas atrasam aquele e-mail por até 15 minutos, então dá
para atrapalhar de propósito o login de alguém cujo e-mail se conheça. É atraso, não bloqueio
permanente, e não ter limite é pior.

Fixture autouse em `conftest.py` zera os contadores entre casos — sem isso, os vários testes que
erram a senha de propósito somariam até fazer testes sem relação alguma falharem com 429. Testes:
`tests/test_rate_limit.py` (11 casos).

### 2. Tela dos comprovantes financeiros

A API de anexos existia desde a tarefa 20 e nenhuma tela chegava até ela: a tabela apenas *contava*
os arquivos. Na prática, "armazenar comprovantes financeiros" — objetivo do PRD e o que a
contabilidade pede — só era alcançável por chamada direta ao endpoint.

Novos `services/anexoService.ts` e `components/common/AnexosLancamento.tsx`, ligados nas quatro telas
financeiras (o botão substituiu a contagem estática em Despesas e no dashboard; Receitas e
Movimentações ganharam a coluna). `utils/download.ts` saiu de dentro do `reportService` para ser
compartilhado pelos dois.

**Decisões:** a visualização é **dentro do modal**, não em aba nova — o conteúdo só chega depois do
`await` (o endpoint exige `Authorization`, então não há URL que um `<a>` abra sozinho) e uma aba
aberta longe do clique é bloqueada como popup. PDF usa `<iframe>` e não `<embed>`, que é o único que
o Safari do iPhone renderiza a partir de blob. Tipo e tamanho são validados no cliente antes do
envio, espelhando o backend, para não subir 5MB por rede de celular e ouvir um 400 no fim. Todo blob
de visualização é revogado ao trocar de arquivo ou fechar.

**Achado, corrigido no backend:** o diálogo de exclusão de lançamento dizia que os comprovantes
"vão junto", mas a chave estrangeira de `anexos_financeiros` não tem cascata — a exclusão era
recusada com a mensagem genérica de integridade referencial, sem dizer ao usuário o que fazer. A
rota passou a contar os anexos e recusar com 409 nomeando o motivo, e o texto da tela agora diz a
verdade: comprovante é documento contábil e não sai em cascata por um clique de correção. Testes:
`tests/test_anexos_financeiros.py::test_excluir_movimentacao_com_comprovante_e_recusado` e
`src/services/anexoService.test.ts` (11 casos).

### 3. Backup dos arquivos e backups semanal/mensal

O `pg_dump` diário não alcança os comprovantes nem as fotos: eles vivem no Supabase Storage, fora do
banco. Uma restauração devolveria as movimentações **sem os comprovantes**. E dos três níveis de
retenção previstos na política, só o diário existia — faltava justamente o mensal, que é o que
atende à guarda de 24 meses dos registros financeiros.

`.github/workflows/backup.yml` passou a fazer, além do dump diário: espelho diário dos arquivos
(`aws s3 sync` **sem** `--delete`), cópia do dump aos domingos (6 meses) e, no dia 1, pacote
`.tar.gz` criptografado de todos os arquivos junto com o dump (24 meses). A retenção virou uma função
de shell aplicada às três pastas, com a data lida do nome do arquivo — não da data de modificação no
bucket, que uma cópia server-side reescreveria.

**Decisões:** os arquivos têm duas estratégias porque as perdas são diferentes — o espelho responde
à perda provável do dia a dia (alguém remove o comprovante errado) e por isso **não** expira nem usa
`--delete`; o pacote mensal responde a "preciso dos comprovantes de dois anos atrás", que um espelho
do presente não responde. O semanal leva só o banco: empacotar os arquivos 26 vezes por ano
encostaria na cota de 1GB do plano gratuito sem cobrir nada novo. O espelho é a única parte sem
criptografia adicional, para que conferir um comprovante não exija restaurar o backup inteiro.

**Limitação que continua:** o destino é o mesmo projeto Supabase que guarda os arquivos de produção.
Protege contra perda do banco no Neon, exclusão acidental e corrupção — não contra perder o projeto
Supabase inteiro. Fechar isso é decisão da associação (segundo provedor); os segredos `BACKUP_S3_*`
já são separados dos da API para que apontar para outro lugar seja só trocar valores. Registrado em
`BACKUP_E_RESTAURACAO.md`, que teve a seção de automação reescrita.

### 4. Tela de Pessoas e troca da própria senha

Duas ausências que não estavam registradas em documento nenhum.

**Pessoas:** não havia rota nem item de menu. Pessoa só era criada de dentro do formulário de membro,
voluntário ou beneficiário — então uma pessoa **sem vínculo**, ou com o vínculo encerrado, ficava
inalcançável pela interface, embora continuasse no banco com CPF e endereço e o backend sempre tenha
tido o CRUD completo. Isso contradizia a decisão de modelagem central do sistema (Pessoa é a
entidade; vínculo é acessório). Novos `services/pessoaService.ts` e `pages/people/PeopleList.tsx`,
rota `/pessoas` (`view_people`) e o item "Cadastro de pessoas" como primeiro do submenu Pessoas.

A lista mostra os vínculos de cada pessoa e tem filtro "Sem vínculo", que é a razão de a tela
existir. Os vínculos vêm de quatro requisições no total, não por linha. **Decisão:** um 403 numa
dessas listas vira "não sei", não zero — quem não pode ver voluntários não deve concluir que ninguém
é voluntário, então a tela mostra "—" em vez de "Sem vínculo" e avisa que a visão está parcial. CPF é
validado no cliente (`cpfValido`) porque o backend só verifica duplicidade, não os dígitos, e um CPF
errado é pior que nenhum: é a chave pela qual a pessoa é encontrada depois. Campo vazio grava `null`
e não `''`, senão a segunda pessoa sem CPF colidiria com a primeira na restrição de unicidade. O
diálogo de exclusão explica que ela existe para pedido de exclusão do titular (LGPD) e cadastro
duplicado — para quem só saiu da associação, o caminho é encerrar o vínculo.

Chaves de permissão novas: `edit_people` e `delete_people` (`pessoas.excluir` é a única permissão de
exclusão dedicada do sistema e hoje só o Administrador a tem).

**Troca de senha:** o único caminho era o fluxo de recuperação por e-mail, que serve ao esquecimento.
Como a senha inicial é definida por um administrador, trocá-la é rotina — e quem desconfia que a
senha foi vista não deveria depender de receber um e-mail. Nova rota `POST /auth/alterar-senha`
(exige a senha atual, limitada por usuário) e nova tela `/minha-conta`, sem exigência de permissão,
com foto, perfis e o formulário de troca.

**Decisões:** a troca invalida os tokens de recuperação pendentes (senão um link pedido antes
continuaria valendo por meia hora, justamente o caminho de volta para quem tomou o e-mail); e **não**
derruba as sessões abertas, porque JWT é stateless e não há blacklist na v1 — a tela diz isso ao
usuário para ele não supor que trocar a senha expulsa quem estiver em outro aparelho. A auditoria
registra a troca sem nada do conteúdo (o que mudou é o hash, que não entra em auditoria). Testes:
`tests/test_alterar_senha.py` (8 casos) e `src/services/pessoaService.test.ts` (10 casos).

### 5. Monitoramento de erros

Um erro 500 em produção só era conhecido por quem abrisse o log do Render na hora certa, e um erro
de renderização no React apagava a tela sem deixar rastro **nenhum** — nenhuma requisição falhava.
Era o modo de falha mais invisível do sistema.

`app/core/monitoramento.py` reúne três peças: log com formato fixo (hora, nível, `[request_id]`),
`RequestIdMiddleware` que devolve `X-Request-Id` em toda resposta, e handler global de `Exception`
que loga o traceback com método e caminho e responde ao cliente apenas com o código da requisição —
que a mensagem de erro mostra, para o usuário poder informá-lo. O relato externo (Sentry) liga só
quando `SENTRY_DSN` existe; sem DSN a aplicação sobe normalmente, porque um sistema sem
monitoramento atende e um que não sobe não atende ninguém.

**Privacidade:** o que sai para o Sentry é deliberadamente pobre — `send_default_pii=False`, corpo de
requisição nunca, e remoção explícita de `Authorization`, `Cookie` e `Set-Cookie` no `before_send`.
Sem isso, um erro num POST de cadastro levaria CPF e endereço para um terceiro junto com o traceback.
Registrado em `PRIVACIDADE_E_RETENCAO.md`.

No frontend, `ErrorBoundary` (fora dos providers, para pegar também um erro dentro deles) troca a
tela branca por uma tela com explicação e caminho de volta, e relata o erro em
`POST /monitoramento/erro-cliente` — rota autenticada, com limite de chamadas e campos curtos, que
leva mensagem, caminho e pilha de componentes ao mesmo log dos erros de servidor. Nunca conteúdo de
formulário. Testes: `tests/test_monitoramento.py` (9 casos), `tests/test_erro_cliente.py` (4 casos) e
`src/components/common/ErrorBoundary.test.tsx` (5 casos).

### Estado ao fim da rodada

Backend: 186/186. Frontend: 211/211. `tsc --noEmit` e `npm run build` limpos. **Sem navegador neste
ambiente:** as quatro telas novas ou alteradas (comprovantes, Pessoas, Minha conta, tela de erro) não
foram abertas em navegador de verdade — o que os testes cobrem é o serviço, o comportamento do
componente em jsdom e as regras do backend.

### O que a revisão apontou e ficou de fora

Ordem original do levantamento; os cinco primeiros são os desta rodada. Continuam abertos:

- **Estoque e Doações**, nem modelados (`docs/futuro/`) — são 2 dos 15 objetivos do PRD e dependem de
  validação com a associação.
- **Cargos de membro**: somente leitura na interface.
- **Campos sensíveis de beneficiário** (renda, necessidades) visíveis a todo perfil com
  `beneficiarios.visualizar` — gap já registrado em `PRIVACIDADE_E_RETENCAO.md`.
- **Rotina de limpeza dos tokens de recuperação** expirados.
- **Alerta de backup ausente por mais de 48h** e **teste de restauração**, que nunca foi executado.
- **Cobertura de tela**: o financeiro, módulo com mais regra de negócio, segue sem teste de
  componente; não há teste ponta a ponta em navegador.

## Telas novas abertas em navegador - "Concluído"

As telas de Pessoas, Minha conta e a tela de erro foram abertas no Chromium (Playwright), com backend
e Postgres locais, dados de teste e quatro perfis (Administrador, Secretário, Financeiro, Voluntário),
em 1366 px e 390 px. As regras de vínculo, permissão, CPF, troca de senha, foto e o relato da tela de
erro funcionaram como descrito. Defeitos encontrados e corrigidos:

- **Modais fora da tela com a página rolada**, em todo o sistema. `.animate-fade-in` usava
  `animation-fill-mode: both`, e o `transform` que sobrava no container da página prendia o
  `position: fixed` do modal à caixa da página. Agora a animação usa `backwards` e o `Modal` é
  renderizado num portal no `body`.
- **Ações cortadas no celular** na lista de Pessoas: abaixo de `sm` os vínculos vão para baixo do
  nome, e a coluna própria some.
- **CPF, "Nova pessoa" e "Usuário do sistema" quebrando linha** na tabela e no cabeçalho.
- **Aviso "Senha curta" que nunca aparecia** em Minha conta: o `minLength` dos campos fazia o
  navegador barrar o envio antes.
- **Lista de Pessoas sem ordem**: quem era editado ia para o fim. Agora a lista vem em ordem
  alfabética (pt-BR).
- O filtro "Contas técnicas", quando vazio, diz onde se marca uma conta técnica
  (Configurações > Usuários).

Frontend: 212/212. `tsc --noEmit` e `npm run build` limpos.

## Travas para não perder o acesso de administrador - "Concluído"

Item RQ-04 da rodada de QA de 25/09/2026. Qualquer admin podia desativar a si mesmo, o último
admin ativo ou o dono do sistema (`POST /usuarios/{id}/desativar` e `PUT` com `ativo=false` não
verificavam nada), e o `criar_admin` se recusa a rodar enquanto houver algum admin ativo, então o
dono desativado por outro admin ficava sem caminho de volta.

- Ninguém desativa a própria conta nem remove o próprio perfil de Administrador (403).
- O último administrador ativo não pode ser desativado nem rebaixado (409).
- Nova marca `usuarios.protegido` (conta principal): só a própria conta troca e-mail e senha,
  se desativa ou perde o Administrador. Marcada por `scripts/proteger_conta.py` no shell do
  servidor; o `criar_admin` já cria o primeiro admin marcado. Sem rota nem tela para marcar.
- Toda tentativa recusada vai para a auditoria com a ação `bloquear`.
- A tela de usuários mostra o selo "CONTA PRINCIPAL" e esconde os botões que o backend recusaria.

Backend: 194/194. Frontend: 218/218. `tsc --noEmit` e `npm run build` limpos.
