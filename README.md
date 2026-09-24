# Sistema de Gestão da Associação Cristã Pau-Brasil

Sistema web desenvolvido para centralizar e facilitar a gestão administrativa, social, financeira e operacional da **Associação Cristã Pau-Brasil (ACPB)**.

O projeto tem como objetivo reduzir a dependência de controles manuais e informações dispersas, proporcionando uma plataforma centralizada para gerenciamento de pessoas, membros, voluntários, beneficiários, projetos, eventos, inscrições, finanças, patrimônio, estoque e demais informações relevantes para a associação.

---

## 📌 Status do projeto

**Em produção — validação de uso real e ajustes contínuos**

> O sistema está implantado no Render e sendo exercitado com dados reais. O back-end está
> implementado, o front-end consome a API real (nenhuma tela usa dados fictícios) e cada
> `push` na `main` publica após o CI. Estoque e Doações permanecem previstos, mas ainda não foram modelados.

| Módulo                                 | Back-end | Front-end |
| -------------------------------------- | -------- | --------- |
| Autenticação (login, JWT, recuperação) | ✅        | ✅         |
| Limite de tentativas no login e na recuperação | ✅        | — (é do servidor) |
| Trocar a própria senha / Minha conta   | ✅        | ✅         |
| Usuários, perfis e permissões (RBAC)   | ✅        | ✅         |
| Pessoas e telefones                    | ✅        | ✅ tela própria de cadastro, com os vínculos de cada pessoa |
| Membros                                | ✅        | ✅         |
| Voluntários                            | ✅        | ✅         |
| Beneficiários e atendimentos           | ✅        | ✅         |
| Projetos                               | ✅        | ✅         |
| Eventos, calendário e inscrições       | ✅        | ✅         |
| Financeiro                             | ✅        | ✅         |
| Anexos/comprovantes financeiros        | ✅        | ✅ enviar, visualizar na tela, baixar e remover |
| Foto de pessoa (upload/remoção)        | ✅        | ✅         |
| Dashboards (geral e financeiro)        | ✅        | ✅         |
| Relatórios (CSV / Excel / PDF)         | ✅        | ✅         |
| Auditoria                              | ✅        | ✅         |
| Monitoramento de erros (log com id, handler global, Sentry opcional, erro de tela relatado) | ✅        | ✅         |
| Patrimônio                             | ✅        | ✅         |
| Contas e categorias financeiras        | ✅        | ✅ criar, desativar e reativar pela tela |
| Cargos (de membro)                     | ✅        | ⏳ somente leitura na interface |
| Estoque                                | ⬜        | ⬜         |
| Doações                                | ⬜        | ⬜         |

**Ressalva de validação:** as telas são exercitadas em navegador e no celular, e há testes
automatizados de tela cobrindo os fluxos que já quebraram (sessão ao recarregar, tela de
evento, busca de membros). A cobertura de tela continua parcial: a maior parte da suíte do
front-end testa serviços e regras puras, não componentes. Comportamentos que dependem do
navegador — recorte de imagem em canvas, arrasto, posição do cursor em campo mascarado —
não são cobertos por teste automatizado e só se confirmam abrindo a tela.

O andamento detalhado, tarefa a tarefa, está em
[`docs/historico/progresso-das-tarefas.md`](docs/historico/progresso-das-tarefas.md).

**Versão atual da documentação:** `0.3`

---

## 🎯 Objetivo

Desenvolver uma aplicação web capaz de centralizar e facilitar a gestão da Associação Cristã Pau-Brasil.

Entre os principais objetivos estão:

* Centralizar os cadastros da associação;
* Gerenciar membros;
* Gerenciar voluntários;
* Gerenciar beneficiários;
* Gerenciar projetos sociais;
* Gerenciar eventos e programações;
* Controlar inscrições em eventos;
* Gerenciar receitas e despesas;
* Relacionar despesas aos projetos;
* Armazenar comprovantes financeiros;
* Gerenciar patrimônio;
* Gerenciar estoque;
* Gerenciar doações;
* Disponibilizar dashboards;
* Gerar relatórios;
* Controlar permissões de acesso;
* Registrar ações relevantes realizadas pelos usuários.

---

## 🧩 Principais módulos

### 🔐 Autenticação e usuários

* Login;
* Autenticação de usuários;
* Recuperação de senha;
* Controle de sessão;
* Usuários;
* Perfis;
* Permissões;
* Controle de acesso baseado em funções.

### 👥 Pessoas

O sistema diferencia uma **Pessoa** de seus diferentes vínculos com a associação.

Uma mesma pessoa poderá, por exemplo, ser simultaneamente membro e voluntário.

Principais cadastros:

* Pessoas;
* Membros;
* Voluntários (área, habilidades e disponibilidade, esta última por opções marcáveis que
  crescem com o uso);
* Beneficiários;
* Telefones;
* Foto de perfil, recortada e redimensionada no navegador antes do envio.

### 📁 Projetos

Gerenciamento de projetos sociais da associação, incluindo:

* Cadastro de projetos;
* Responsáveis;
* Participantes;
* Voluntários;
* Eventos relacionados;
* Informações e acompanhamento do projeto.

### 📅 Eventos e agenda

* Calendário;
* Cadastro de eventos;
* Data e horário;
* Local;
* Responsável;
* Limite de participantes;
* Inscrições;
* Acompanhamento dos participantes.

### 💰 Financeiro

* Contas e categorias financeiras, cadastradas pela própria tela;
* Receitas;
* Despesas;
* Movimentações;
* Correção e exclusão de lançamento a partir da linha, em qualquer das quatro telas;
* Relação de despesas com projetos;
* Comprovantes e anexos (contagem na tela; envio e download ainda só pela API);
* Dashboard financeiro;
* Relatórios financeiros.

Doações estão previstas como módulo próprio e ainda não foram modeladas.

O campo de valor usa máscara preenchida da direita para a esquerda, como nos aplicativos
de banco: cada dígito empurra os anteriores e a vírgula nunca é digitada.

### 📦 Estoque

* Cadastro de itens;
* Entradas;
* Saídas;
* Saldo de estoque;
* Acompanhamento das movimentações.

### 🏢 Patrimônio

Controle dos bens pertencentes à associação, como:

* Computadores;
* Mesas;
* Cadeiras;
* Projetores;
* Impressoras;
* Instrumentos;
* Equipamentos;
* Ferramentas.

### 📊 Dashboards e relatórios

O sistema deverá disponibilizar informações consolidadas para auxiliar na gestão.

Exemplos:

* Quantidade de membros;
* Quantidade de voluntários;
* Quantidade de beneficiários;
* Projetos ativos;
* Próximos eventos;
* Situação financeira;
* Receitas;
* Despesas;
* Saldo;
* Informações de estoque.

Os relatórios poderão contemplar formatos como:

* PDF;
* Excel;
* CSV.

### 📝 Auditoria

O sistema deverá manter registros de ações relevantes realizadas pelos usuários.

Exemplos:

* Alteração de informações financeiras;
* Alteração de valores;
* Cancelamento de registros;
* Ações administrativas relevantes.

O objetivo é aumentar a segurança, rastreabilidade e transparência das informações.

---

## 👤 Perfis de acesso

O sistema utilizará controle de acesso baseado em perfis.

| Perfil            | Descrição                                                                    |
| ----------------- | ---------------------------------------------------------------------------- |
| **Administrador** | Acesso completo ao sistema                                                   |
| **Financeiro**    | Acesso ao módulo financeiro e informações autorizadas                        |
| **Coordenador**   | Administração de projetos, eventos, voluntários e participantes relacionados |
| **Voluntário**    | Acesso limitado às funcionalidades necessárias para sua atuação              |
| **Consulta**      | Acesso somente para visualização das informações autorizadas                 |

As permissões poderão ser refinadas conforme a evolução dos requisitos do projeto.

---

## 🏗️ Arquitetura

A arquitetura tecnológica inicial está organizada da seguinte forma:

```text
                    INTERNET
                       │
                       ▼
              ┌─────────────────┐
              │   React + TS    │
              │    Front-end    │
              └────────┬────────┘
                       │
                     HTTPS
                       │
                       ▼
              ┌─────────────────┐
              │     FastAPI     │
              │     Python      │
              │    REST API     │
              └────────┬────────┘
                       │
                 ┌─────┴─────┐
                 ▼           ▼
          ┌────────────┐  ┌────────────┐
          │ PostgreSQL │  │  Storage   │
          │            │  │ Documentos │
          └────────────┘  └────────────┘
```

---

## 🛠️ Tecnologias

### Front-end

* React 19 + TypeScript 5
* Vite 6 (build e servidor de desenvolvimento)
* Tailwind CSS 4
* React Router 7
* Vitest + jsdom (testes)

### Back-end

* Python 3.12 (versão fixada no CI e em produção)
* FastAPI + Uvicorn
* Pydantic (schemas e validação)
* pytest (testes)

### Banco de dados

* PostgreSQL
* SQLAlchemy (ORM)
* Alembic (migrations)

### Autenticação e autorização

* JWT (HS256, token de 8h, sem refresh)
* Argon2 via `pwdlib` (hash de senha)
* RBAC por permissão no formato `modulo.acao`

### Relatórios e arquivos

* `openpyxl` (Excel) e `reportlab` (PDF)
* Armazenamento de anexos e fotos com nome sempre gerado por `uuid4`. Em produção vai para
  object storage S3-compatível (Supabase Storage), porque o disco do plano gratuito do
  Render é efêmero e perderia os comprovantes a cada redeploy; em desenvolvimento, disco local

### Envio de e-mail

* API HTTPS da Brevo, usada na recuperação de senha. Não é SMTP de propósito: o Render
  bloqueia as portas 25, 465 e 587 no plano gratuito, e o envio falhava por timeout enquanto
  a tela dizia "instruções enviadas"

### Hospedagem e CI

* Render — dois serviços (API Python e site estático), descritos em [`render.yaml`](render.yaml)
* Banco PostgreSQL no Neon (o Postgres gratuito do Render expira)
* GitHub Actions roda as duas suítes a cada `push` e `pull request`

---

## 🗄️ Modelagem do banco de dados

A modelagem é relacional (PostgreSQL), versionada por migrations do Alembic e
mapeada com SQLAlchemy. Entidades atualmente implementadas:

```text
Pessoas
├── Membros ── Cargos
├── Voluntários
├── Beneficiários ── Atendimentos
├── Telefones
└── Usuários ── Perfis ── Permissões

Projetos
├── Projeto_Voluntários
└── Projeto_Beneficiários

Eventos
└── Inscrições

Financeiro
├── Contas financeiras
├── Categorias financeiras
└── Movimentações financeiras ── Anexos financeiros

Patrimônio

Auditoria
Tokens de redefinição de senha
```

O inventário completo de tabelas, chaves estrangeiras e regras de `ondelete`
está em [`backend/RELACIONAMENTOS.md`](backend/RELACIONAMENTOS.md).

Ainda a modelar: **Estoque** e **Doações**. Patrimônio foi modelado e implementado.

---

## 🎨 Interface

A interface da aplicação seguirá uma identidade visual baseada na comunicação da Associação Cristã Pau-Brasil.

### Diretrizes

* Moderna;
* Limpa;
* Institucional;
* Responsiva;
* Acessível;
* Focada em produtividade;
* Navegação simples e consistente.

### Tema

A primeira versão prioriza um **tema escuro**.

### Paleta institucional

| Cor              | HEX       | Utilização             |
| ---------------- | --------- | ---------------------- |
| Verde ACPB       | `#004922` | Cor primária           |
| Amarelo ACPB     | `#F8D800` | Destaques              |
| Fundo            | `#0F1210` | Fundo principal        |
| Surface          | `#181D1A` | Cards e áreas elevadas |
| Surface 2        | `#222824` | Elementos secundários  |
| Texto secundário | `#AEB5B0` | Informações auxiliares |
| Branco           | `#FFFFFF` | Texto e contraste      |

A documentação visual define também padrões para componentes, estados da interface, navegação, acessibilidade e organização das telas.

---

## 🗂️ Estrutura prevista da aplicação

A aplicação será organizada em módulos seguindo aproximadamente esta estrutura:

```text
LOGIN
  │
  ▼
DASHBOARD
  │
  ├── PESSOAS
  │   ├── Membros
  │   ├── Voluntários
  │   └── Beneficiários
  │
  ├── PROJETOS
  │
  ├── EVENTOS
  │
  ├── FINANCEIRO
  │
  ├── DOAÇÕES
  │
  ├── ESTOQUE
  │
  ├── PATRIMÔNIO
  │
  ├── RELATÓRIOS
  │
  ├── AUDITORIA
  │
  └── CONFIGURAÇÕES
      ├── Usuários
      └── Permissões
```

---

## 🚀 Como executar o projeto

Pré-requisitos: **Python 3.10+**, **Node.js 18+** e **PostgreSQL** em execução.

### Back-end

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate      # Linux/macOS
pip install -r requirements.txt

cp .env.example .env            # preencher DATABASE_PASSWORD e JWT_SECRET_KEY
alembic upgrade head            # aplica as migrations
uvicorn app.main:app --reload --port 8001
```

* API: `http://localhost:8001`
* Documentação interativa (Swagger): `http://localhost:8001/docs`
* Health checks: `GET /health` e `GET /health/db`

> A porta é **8001**, e não a 8000 padrão do uvicorn, para conviver com outro projeto na
> mesma máquina. O front-end procura a API nesse endereço quando `VITE_API_URL` não está
> definida, então subir na 8000 faz a interface abrir sem conseguir falar com a API.
> Ver [`backend/DEPLOY.md`](backend/DEPLOY.md).

### Front-end

```bash
npm install
npm run dev
```

* Interface: `http://localhost:5174` (porta fixa, própria deste projeto)

Detalhes adicionais (migrations, backups, banco de testes) estão em
[`backend/README.md`](backend/README.md).

---

## 🗂️ Estrutura do repositório

```text
.
├── src/                  # Front-end React + TypeScript
│   ├── components/       # Componentes de UI, layout e comuns
│   ├── contexts/         # AuthContext, ToastContext
│   ├── pages/            # Telas por módulo
│   ├── services/         # Cliente de API e serviços de domínio
│   ├── types/            # Tipos compartilhados
│   └── utils/            # Máscaras, rótulos e regras puras (testadas isoladamente)
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── api/routes/   # Endpoints por módulo
│   │   ├── core/         # Segurança, RBAC, auditoria, storage, relatórios
│   │   ├── models/       # Models SQLAlchemy
│   │   └── schemas/      # Schemas Pydantic
│   ├── alembic/          # Migrations
│   └── tests/            # Suíte pytest
├── docs/                 # Documentação (índice em docs/README.md)
│   ├── produto/          # PRD, descrição da UI e diagrama do banco
│   ├── historico/        # Registro do que foi entregue e por quê
│   └── futuro/           # Módulos previstos e não implementados
├── .github/workflows/    # CI (suítes, typecheck e build de produção) e backup
└── render.yaml           # Blueprint dos dois serviços em produção
```

Os documentos técnicos do back-end ficam em [`backend/`](backend/), ao lado do código que
os referencia.

---

## 📚 Documentação

A documentação do projeto é mantida separadamente do código-fonte para facilitar a evolução dos requisitos.

Tudo começa por [`docs/README.md`](docs/README.md), que indexa os documentos abaixo.

### Produto

* [`docs/produto/prd.md`](docs/produto/prd.md) — requisitos, escopo e perfis de acesso;
* [`docs/produto/descricao-da-ui.md`](docs/produto/descricao-da-ui.md) — identidade visual e padrões de tela;
* [`docs/produto/diagrama-der.png`](docs/produto/diagrama-der.png) — diagrama do banco.

### Histórico

* [`docs/historico/progresso-das-tarefas.md`](docs/historico/progresso-das-tarefas.md) — o que cada tarefa entregou;
* [`docs/historico/auditoria-das-sessoes-de-ia.md`](docs/historico/auditoria-das-sessoes-de-ia.md) — resumo executivo das mudanças, achados e decisões.

### Técnica (back-end)

| Documento | Conteúdo |
| --------- | -------- |
| [`backend/README.md`](backend/README.md) | Instalação, execução, migrations e testes |
| [`backend/RELACIONAMENTOS.md`](backend/RELACIONAMENTOS.md) | Inventário de tabelas, FKs e regras de exclusão |
| [`backend/AUTENTICACAO.md`](backend/AUTENTICACAO.md) | Política de autenticação e tokens |
| [`backend/RBAC.md`](backend/RBAC.md) | Matriz de perfis × permissões |
| [`backend/CORS_E_PRODUCAO.md`](backend/CORS_E_PRODUCAO.md) | CORS e validações obrigatórias em produção |
| [`backend/DEPLOY.md`](backend/DEPLOY.md) | Deploy, health checks, logs e rollback |
| [`backend/BACKUP_E_RESTAURACAO.md`](backend/BACKUP_E_RESTAURACAO.md) | Política de backup, retenção e testes de restauração |
| [`backend/PRIVACIDADE_E_RETENCAO.md`](backend/PRIVACIDADE_E_RETENCAO.md) | Classificação de dados pessoais e política de retenção |

---

## 🚧 Escopo e evolução

O projeto será desenvolvido de forma incremental.

Funcionalidades como:

* Aplicativo mobile;
* Integração com WhatsApp;
* Notificações push;
* QR Code;
* Check-in;
* Integrações externas;
* Portal público;
* Funcionalidades avançadas de contabilidade;
* Recursos avançados de estoque, patrimônio e voluntariado;

não fazem parte do primeiro ciclo de desenvolvimento.

Essas funcionalidades poderão ser avaliadas posteriormente conforme as necessidades da associação e a evolução do projeto.

---

## 🔒 Segurança

Já implementado:

* Autenticação via JWT, com verificação do usuário ativo a cada requisição;
* Senhas armazenadas com Argon2 — nenhum hash é exposto em respostas da API;
* Autorização RBAC por permissão `modulo.acao` em todas as rotas de negócio;
* Auditoria de operações sensíveis (ator, ação, tabela, registro, dados antes/depois e IP);
* Exclusão substituída por inativação nos cadastros críticos, preservando o histórico;
* Upload de arquivos com tipo e tamanho validados e nome sempre gerado por `uuid4`;
* Download de anexos e fotos apenas por rota autenticada — nada exposto como arquivo estático;
* Recuperação de senha com token de uso único, expiração de 30 min e apenas o hash persistido;
* Redefinição de senha por administrador, para quem perdeu acesso ao e-mail cadastrado;
* Recusa de iniciar em produção sem `JWT_SECRET_KEY`, sem `DATABASE_PASSWORD` ou com CORS aberto;
* Política de backup e de retenção de dados documentada.

---

## 🧪 Desenvolvimento

O projeto é desenvolvido de maneira incremental. Situação das etapas:

```text
Levantamento de requisitos     ✅ concluído
Documentação do produto        ✅ concluído
Modelagem do banco             ✅ concluído (exceto estoque/doações)
Arquitetura técnica            ✅ concluído
Back-end / API                 ✅ concluído para o escopo da 1ª versão
Front-end                      ✅ concluído para o escopo da 1ª versão
Integração front ↔ back        ✅ concluída (nenhuma tela usa dados fictícios)
Testes                         ✅ automatizados; cobertura de tela ainda parcial
Implantação                    ✅ em produção no Render, publicando a cada push na main
```

Daqui em diante a evolução é guiada pelo uso real: o que aparece como confuso ou faltante
para quem opera o sistema vira a próxima tarefa.

### Testes automatizados

| Suíte     | Comando                | Situação     |
| --------- | ---------------------- | ------------ |
| Back-end  | `cd backend && pytest` | 153 testes ✅ |
| Front-end | `npm test`             | 169 testes ✅ |

Além das duas suítes, `npx tsc --noEmit` e `npm run build` rodam no CI — o build de
produção falha de propósito se `VITE_API_URL` não estiver definida, para não gerar um
pacote apontando para a máquina de quem compilou.

Os testes de back-end rodam contra um banco **isolado** (`acpb_db_test`) — a
suíte se recusa a iniciar caso aponte para o banco de desenvolvimento. As
instruções de preparação desse banco estão em
[`backend/README.md`](backend/README.md).

---

## 📈 Critérios iniciais de sucesso

A primeira versão será considerada funcional quando a associação conseguir:

* [x] Acessar o sistema com segurança;
* [x] Gerenciar usuários;
* [x] Cadastrar membros;
* [x] Cadastrar voluntários;
* [x] Cadastrar beneficiários;
* [x] Gerenciar projetos;
* [x] Criar e visualizar eventos;
* [x] Controlar inscrições;
* [x] Registrar receitas;
* [x] Registrar despesas;
* [x] Anexar comprovantes;
* [x] Visualizar informações financeiras;
* [x] Controlar permissões;
* [x] Consultar informações através dos dashboards;
* [x] Gerar os relatórios previstos para a primeira versão;
* [x] Corrigir e excluir lançamentos financeiros errados, com registro em auditoria;
* [x] Usar o sistema em produção, pelo computador e pelo celular.

A primeira versão foi entregue e está em uso. O que segue em aberto:

* **Estoque** e **Doações** — previstos, ainda não modelados;
* **Anexos financeiros** — a API envia e devolve comprovantes; a tela apenas os conta;
* **Cargos de membro** — cadastrados apenas pela API;
* **Cobertura de tela** — a suíte do front-end testa sobretudo serviços e regras puras.

---

## 🤝 Projeto

**Sistema de Gestão da Associação Cristã Pau-Brasil**

Desenvolvido com o objetivo de fornecer à ACPB uma ferramenta centralizada para organização, gestão e acompanhamento de suas atividades.

---

