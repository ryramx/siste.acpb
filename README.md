# Sistema de Gestão da Associação Cristã Pau-Brasil

Sistema web desenvolvido para centralizar e facilitar a gestão administrativa, social, financeira e operacional da **Associação Cristã Pau-Brasil (ACPB)**.

O projeto tem como objetivo reduzir a dependência de controles manuais e informações dispersas, proporcionando uma plataforma centralizada para gerenciamento de pessoas, membros, voluntários, beneficiários, projetos, eventos, inscrições, finanças, patrimônio, estoque e demais informações relevantes para a associação.

---

## 📌 Status do projeto

**Em desenvolvimento — primeira versão funcional integrada**

> O back-end está implementado e o front-end já consome a API real (nenhuma tela
> usa dados fictícios). Os módulos de Patrimônio, Estoque e Doações permanecem
> previstos, mas ainda não foram modelados.

| Módulo                                 | Back-end | Front-end |
| -------------------------------------- | -------- | --------- |
| Autenticação (login, JWT, recuperação) | ✅        | ✅         |
| Usuários, perfis e permissões (RBAC)   | ✅        | ✅         |
| Pessoas e telefones                    | ✅        | ✅         |
| Membros                                | ✅        | ✅         |
| Voluntários                            | ✅        | ✅         |
| Beneficiários e atendimentos           | ✅        | ✅         |
| Projetos                               | ✅        | ✅         |
| Eventos, calendário e inscrições       | ✅        | ✅         |
| Financeiro e anexos/comprovantes       | ✅        | ✅         |
| Foto de pessoa (upload/remoção)        | ✅        | ✅         |
| Dashboards (geral e financeiro)        | ✅        | ✅         |
| Relatórios (CSV / Excel / PDF)         | ✅        | ⏳ API pronta, tela pendente |
| Auditoria                              | ✅        | ⏳ API pronta, tela pendente |
| Patrimônio                             | ⬜        | ⬜         |
| Estoque                                | ⬜        | ⬜         |
| Doações                                | ⬜        | ⬜         |

**Ressalva de validação:** o front-end foi validado por build TypeScript, testes
automatizados e chamadas end-to-end reais à API, mas ainda não passou por uma
revisão visual completa em navegador.

O andamento detalhado, tarefa a tarefa, está em
[`tarefas_pendentes/progresso.md`](tarefas_pendentes/progresso.md).

**Versão atual da documentação:** `0.2`

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
* Voluntários;
* Beneficiários;
* Telefones.

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

* Categorias financeiras;
* Receitas;
* Despesas;
* Doações;
* Movimentações;
* Relação de despesas com projetos;
* Comprovantes e anexos;
* Dashboard financeiro;
* Relatórios financeiros.

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

* Python 3.10+
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
* Armazenamento local de anexos e fotos, com nome de arquivo sempre gerado por `uuid4`

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
└── Projeto_Voluntários

Eventos
└── Inscrições

Financeiro
├── Contas financeiras
├── Categorias financeiras
└── Movimentações financeiras ── Anexos financeiros

Auditoria
Tokens de redefinição de senha
```

O inventário completo de tabelas, chaves estrangeiras e regras de `ondelete`
está em [`backend/RELACIONAMENTOS.md`](backend/RELACIONAMENTOS.md).

Ainda a modelar: **Patrimônio**, **Estoque** e **Doações**.

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
uvicorn app.main:app --reload
```

* API: `http://localhost:8000`
* Documentação interativa (Swagger): `http://localhost:8000/docs`
* Health checks: `GET /health` e `GET /health/db`

### Front-end

```bash
npm install
npm run dev
```

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
│   └── types/            # Tipos compartilhados
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── api/routes/   # Endpoints por módulo
│   │   ├── core/         # Segurança, RBAC, auditoria, storage, relatórios
│   │   ├── models/       # Models SQLAlchemy
│   │   └── schemas/      # Schemas Pydantic
│   ├── alembic/          # Migrations
│   └── tests/            # Suíte pytest
├── tarefas_pendentes/    # Plano de tarefas e registro de progresso
└── sist.acpb.arq/        # PRD e documentação de produto/UI
```

---

## 📚 Documentação

A documentação do projeto é mantida separadamente do código-fonte para facilitar a evolução dos requisitos.

### Produto

* **PRD** e **Descrição da UI** — em [`sist.acpb.arq/`](sist.acpb.arq/);
* [`tarefas_pendentes/progresso.md`](tarefas_pendentes/progresso.md) — registro do que já foi entregue, tarefa a tarefa;
* [`AUDIT.md`](AUDIT.md) — resumo executivo das mudanças, achados e decisões.

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
* Recusa de iniciar em produção sem `JWT_SECRET_KEY`, sem `DATABASE_PASSWORD` ou com CORS aberto;
* Política de backup e de retenção de dados documentada.

---

## 🧪 Desenvolvimento

O projeto é desenvolvido de maneira incremental. Situação das etapas:

```text
Levantamento de requisitos     ✅ concluído
Documentação do produto        ✅ concluído
Modelagem do banco             ✅ concluído (exceto patrimônio/estoque/doações)
Arquitetura técnica            ✅ concluído
Back-end / API                 ✅ concluído para o escopo da 1ª versão
Front-end                      ✅ concluído para o escopo da 1ª versão
Integração front ↔ back        ✅ concluída (nenhuma tela usa dados fictícios)
Testes                         ✅ automatizados; falta validação visual em navegador
Implantação                    ⏳ documentada, ainda não executada
```

### Testes automatizados

| Suíte     | Comando                | Situação    |
| --------- | ---------------------- | ----------- |
| Back-end  | `cd backend && pytest` | 88 testes ✅ |
| Front-end | `npm test`             | 27 testes ✅ |

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
* [x] Gerar os relatórios previstos para a primeira versão *(disponíveis via API; tela dedicada pendente)*.

Para a entrega efetiva à associação, faltam **validação visual em navegador** e
**implantação em ambiente de produção**.

---

## 🤝 Projeto

**Sistema de Gestão da Associação Cristã Pau-Brasil**

Desenvolvido com o objetivo de fornecer à ACPB uma ferramenta centralizada para organização, gestão e acompanhamento de suas atividades.

---

