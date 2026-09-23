# AUDIT.md — Registro de auditoria das mudanças realizadas por sessão de IA

Este arquivo consolida, para fins de auditoria, tudo o que foi executado por assistência de IA
neste repositório: escopo pedido, o que foi implementado, bugs reais encontrados e corrigidos,
decisões de segurança/autorização tomadas, e o que ficou pendente ou fora do escopo.

O registro tarefa-a-tarefa (com detalhes técnicos de arquivos/migrations) está em
[`progresso-das-tarefas.md`](progresso-das-tarefas.md). Este arquivo é o resumo executivo.

---

## 1. Escopo do trabalho

Pedido inicial do usuário: revisar os 42 arquivos de tarefas do plano original (plano de
integração backend/frontend do "Sistema ACPB" em 6 fases), entender o fluxo, e então executar as
Fases 1 a 5 sequencialmente, documentando o progresso, deixando a Fase 6 (itens marcados como
FUTURO) para decisão posterior. Depois da entrega das 5 fases, houve uma rodada adicional de
correções de bugs encontrados em teste manual, e um pedido pós-entrega (funcionalidade de foto de
perfil).

## 2. O que foi implementado, por fase

### Fase 1 — Banco e migrações (Tarefas 01–06) — Concluída
- Inventário completo de relacionamentos (`backend/RELACIONAMENTOS.md`), todos os 19 models
  registrados no SQLAlchemy, FKs/constraints/índices únicos adicionados, relacionamentos ORM
  completos (`configure_mappers()` validado).
- **Achado:** o banco `acpb_db` já existia em produção com dados reais e uma tabela
  (`atendimentos`) sem model correspondente. Antes de qualquer migration, foi feito backup via
  `pg_dump`. A migration baseline foi gerada e testada de ponta a ponta contra um banco vazio
  isolado, e no banco real foi aplicada via `alembic stamp head` (sem recriar tabelas existentes),
  criando apenas o que de fato era novo (um índice único parcial). `alembic check` confirmou zero
  divergência entre models e banco ao final.

### Fase 2 — Segurança, acesso e auditoria (Tarefas 07–15) — Concluída
- Política de autenticação documentada (JWT HS256, token único de 8h, sem refresh), hash de senha
  via Argon2 (`pwdlib`), login JWT, proteção de todas as rotas de negócio via
  `Depends(get_current_user)`.
- RBAC completo (matriz em `backend/RBAC.md`). **Achado importante:** os 6 perfis e 29 permissões
  já existiam no banco, mas a tabela de vínculo `perfil_permissoes` estava **totalmente vazia** —
  ou seja, nenhum perfil tinha nenhuma permissão efetiva antes desta correção. Corrigido com
  migration de seed idempotente.
- CRUD de usuários/perfis/permissões com bloqueios de segurança (não é possível desativar o perfil
  Administrador, remover sua permissão, ou remover o último administrador ativo).
- Recuperação de senha com token de uso único, expiração de 30 min, apenas hash SHA-256 persistido.
- Auditoria automática (ator, ação, tabela, registro, dados antes/depois, IP) em todas as operações
  sensíveis, nunca serializando `senha_hash`/tokens.

### Fase 3 — Cadastros e integrações de domínio (Tarefas 16–25) — Concluída (exceto 3 itens FUTURO)
- CRUD de telefones, cadastro transacional de Pessoa + vínculos (Membro/Voluntário/Beneficiário)
  com rollback automático em caso de falha parcial.
- Tratamento uniforme de violações de FK/unicidade (nunca vaza erro 500 cru).
- Registro de atendimentos, anexos financeiros (upload/download seguro: nome de arquivo sempre
  gerado por `uuid4`, nunca confia no nome enviado pelo cliente; tipo/tamanho validados).
- Dashboard financeiro (resumo por período, por categoria, evolução mensal, despesas por projeto).
- Relatórios/exportações (CSV/Excel/PDF) para financeiro, pessoas, projetos e eventos.
- **Fora do escopo por definição do próprio plano** (marcados como FUTURO no plano original, não
  implementados nesta rodada): Tarefa 23 (Patrimônio), 24 (Estoque), 25 (Doações).

### Fase 4 — Frontend e experiência (Tarefas 26–34) — Concluída
- Cliente de API reescrito (`apiClient.ts`) com tratamento uniforme de erros e sessão via Bearer
  token.
- Autenticação real integrada (endpoint `/auth/me` criado no backend para suprir essa necessidade);
  removido o "Admin padrão" implícito e o seletor de perfis mock que existia na UI.
- Serviços de Membros, Voluntários, Beneficiários, Projetos/Eventos/Inscrições e Financeiro
  reescritos para consumir dados reais da API, com remoção de todos os campos fictícios que não
  existiam no backend (ex.: "projeto do membro", "horas trabalhadas", contadores inventados,
  percentuais de gráfico fixos no código).
- **Bugs reais encontrados e corrigidos durante os testes end-to-end desta fase** (ver seção 3).
- Dashboard geral e calendário de eventos reescritos com dados reais (antes eram grades/estados
  estáticos fixos).
- Revisão de acessibilidade: `role="dialog"`/`aria-modal`/fechar com Esc no componente `Modal`
  compartilhado, `aria-label` em todos os botões icon-only encontrados sem rótulo, correção de 3
  tabelas sem `overflow-x-auto` (causariam scroll horizontal da página inteira em telas estreitas).
- **Ressalva conhecida:** todo o trabalho de frontend desta fase foi validado via `tsc --noEmit`,
  `npm run build` e simulação end-to-end via `curl` replicando exatamente as chamadas do frontend —
  **não houve teste visual em navegador real** neste ambiente de execução (decisão explícita do
  usuário: prosseguir sem teste visual). Recomenda-se uma passada manual pela UI antes de considerar
  esta fase 100% validada visualmente.

### Fase 5 — Qualidade e operação (Tarefas 35–39) — Concluída
- Suíte de testes ampliada: 74 testes de backend construídos ao longo da execução (não
  pré-existiam), 17 testes de frontend criados do zero (Vitest/jsdom, antes não havia nenhum).
  **Ressalva registrada:** os testes de backend rodam contra o banco de desenvolvimento real com
  fixtures de criação/limpeza manual, não um banco de testes isolado — recomenda-se um banco
  dedicado (`acpb_db_test`) como melhoria futura.
- Política de backup/restauração documentada (`backend/BACKUP_E_RESTAURACAO.md`).
- Configuração de produção enrijecida: a aplicação agora **recusa subir** em
  `ENVIRONMENT=production` se `JWT_SECRET_KEY`, `DATABASE_PASSWORD` estiverem vazios ou
  `BACKEND_CORS_ORIGINS` vazio/contendo `*`.
- Documentação de deploy/operação e de privacidade/retenção de dados, incluindo um gap de RBAC
  registrado conscientemente (falta permissão granular para campos socioeconômicos de
  beneficiários — decisão de produto pendente, não de código).

### Fase 6 — Funcionalidades futuras — Não iniciada (por decisão do usuário)
Tarefas 40–42 (Comunicação interna, recursos avançados de eventos, recursos avançados
operacionais) permanecem pendentes, aguardando decisão sobre se/quando entram em escopo.

## 3. Bugs reais encontrados e corrigidos (não eram apenas gaps de escopo)

1. **Timestamps ausentes em criações diretas** — quase todas as rotas de domínio (`cargos`,
   `voluntarios`, `beneficiarios`, `projetos`, `eventos`, `inscricoes`, `movimentacoes_financeiras`,
   `contas_financeiras`, `categorias_financeiras`, `membros`) não preenchiam `created_at`/
   `updated_at` ao criar registros fora do fluxo `/cadastros/pessoa-vinculo`, causando violação de
   NOT NULL em qualquer POST direto. Os testes anteriores não pegavam isso por só cobrirem o caso
   de FK inválida. Corrigido em todas as rotas afetadas; teste de regressão adicionado.
2. **Filtro de inscrições ignorado** — `GET /inscricoes/` retornava sempre todas as inscrições do
   sistema, ignorando os filtros `evento_id`/`pessoa_id` — a tela de inscritos de um evento
   mostraria inscritos de **todos** os eventos. Corrigido e travado por teste de regressão.
3. **Login bloqueado para todo usuário real (`.local` domain)** — descoberto em teste manual em
   navegador, fora do fluxo de execução das fases: `EmailStr` do Pydantic rejeita domínios de uso
   especial (RFC 6761) como `.local`, que é exatamente o domínio usado nos e-mails
   institucionais/seed do projeto (`admin@acpb.local`, etc.). Isso bloquearia o login de **qualquer**
   usuário real do sistema. Corrigido substituindo `EmailStr` por validação de formato simples nos
   schemas de login e de usuário; teste de regressão adicionado. Suíte completa re-validada.
4. **Launcher do venv quebrado após mover a pasta do projeto** — `uvicorn.exe`/`pip.exe` tinham o
   caminho absoluto de criação original do venv embutido (`pyvenv.cfg`), que não existia mais após
   o projeto ser movido de pasta/máquina. Não é um bug de código, mas documentado aqui porque
   impediu subir o backend localmente. Contorno: usar `python -m uvicorn ...` em vez do `.exe`
   quebrado (o `python.exe` do venv continua funcional). Recriar o venv do zero é a correção
   definitiva, ainda não feita — só será executada se o usuário pedir explicitamente, por ser uma
   operação que altera o ambiente local.

## 4. Ações administrativas realizadas fora do plano de tarefas

- Geração de senha temporária e atualização direta no banco para o usuário de id 2 (conta do
  próprio usuário, `ryanfilipe2010@gmail.com`), a pedido explícito dele, para permitir o primeiro
  login real no sistema.
- Concessão do perfil "Administrador" a essa mesma conta via inserção direta na tabela
  `usuario_perfis`, a pedido explícito, para permitir visualização completa do sistema.

Ambas as ações foram feitas diretamente no banco de desenvolvimento, fora de qualquer endpoint da
aplicação, e alteram estado real de dados — registradas aqui para rastreabilidade, já que não
passam pelo mecanismo de auditoria da aplicação (que só audita ações feitas via API).

## 5. Trabalho pós-entrega: funcionalidade de foto de perfil

Pedido do usuário após a entrega das 5 fases: por padrão, membros/voluntários/usuários não devem
ter nenhuma foto (as fotos de banco de imagens de terceiros — Unsplash — que estavam hardcoded na
UI foram todas removidas), e foi implementada a funcionalidade real de enviar/remover foto.

- **Backend:** nova coluna `pessoas.foto_arquivo` + property `tem_foto`; armazenamento em disco
  local seguindo o mesmo padrão de segurança dos anexos financeiros (nome de arquivo sempre gerado
  por `uuid4`, nunca confia no nome enviado pelo cliente); upload limitado a PNG/JPEG e 2MB; 3
  endpoints novos (`POST/GET/DELETE /pessoas/{id}/foto`).
- **Decisão de autorização deliberada:** essas 3 rotas não exigem simplesmente a permissão
  `pessoas.editar`/`pessoas.visualizar` — isso impediria voluntários e usuários comuns (que não têm
  essa permissão) de sequer ver ou trocar a própria foto. A regra implementada é: qualquer usuário
  pode gerenciar livremente a foto da **própria** pessoa; a permissão de `Pessoa` só é exigida para
  mexer na foto de **outra** pessoa. Testado com casos específicos de usuário sem nenhuma permissão
  gerenciando a própria foto (permitido) e tentando mexer na foto de terceiros (bloqueado, 403).
- **Frontend:** componentes novos `Avatar` (iniciais coloridas quando não há foto) e `AvatarUpload`,
  aplicados em todas as telas que exibiam fotos fictícias (lista/detalhe de membros, lista de
  voluntários, sidebar, e o menu de perfil no topo — este último agora permite a qualquer usuário
  trocar a própria foto pelo dropdown).
- **Validação:** 88/88 testes de backend, `tsc --noEmit` limpo, `npm run build` limpo, 19/19 testes
  de frontend. **Sem teste visual em navegador real** — mesma ressalva da Fase 4.

## 6. Estado atual e pendências conhecidas

- Fase 6 (Comunicação interna, recursos avançados de eventos/operacionais): não iniciada, aguardando
  decisão do usuário.
- Tarefas 23–25 (Patrimônio, Estoque, Doações): fora do escopo por definição do próprio plano
  original, não implementadas.
- Nenhuma parte do frontend foi verificada visualmente em navegador real neste ambiente — toda a
  validação foi por tipagem, build, testes automatizados e simulação de chamadas via `curl`.
- Tela de administração de usuários (`SettingsPage`) ainda usa dados 100% mockados (`mocks/users.ts`),
  não integrada à API real — integração dessa tela é trabalho futuro separado, já sinalizado no
  próprio código com um comentário explícito.
- Banco de testes de backend não é isolado do banco de desenvolvimento real (usa fixtures de
  criação/limpeza manual) — recomendação registrada de configurar um banco dedicado.
- Recriação do venv Python local (quebrado após mover a pasta do projeto) não foi feita — contorno
  em uso (`python -m uvicorn`), aguardando decisão do usuário se quer a correção definitiva.
