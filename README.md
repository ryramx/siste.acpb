# Sistema de Gestão da Associação Cristã Pau-Brasil

Sistema web desenvolvido para centralizar e facilitar a gestão administrativa, social, financeira e operacional da **Associação Cristã Pau-Brasil (ACPB)**.

O projeto tem como objetivo reduzir a dependência de controles manuais e informações dispersas, proporcionando uma plataforma centralizada para gerenciamento de pessoas, membros, voluntários, beneficiários, projetos, eventos, inscrições, finanças, patrimônio, estoque e demais informações relevantes para a associação.

---

## 📌 Status do projeto

**Em desenvolvimento**

> O projeto encontra-se em fase de definição de requisitos, modelagem do banco de dados e implementação da estrutura inicial da aplicação.

**Versão atual da documentação:** `0.1`

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

* React
* TypeScript

### Back-end

* Python
* FastAPI

### Banco de dados

* PostgreSQL

### ORM

* SQLAlchemy

### Autenticação e autorização

* JWT
* RBAC

### Infraestrutura

* Docker

---

## 🗄️ Modelagem do banco de dados

A modelagem está sendo construída de forma relacional utilizando PostgreSQL.

Entre as entidades atualmente modeladas estão:

```text
Pessoas
├── Membros
│   └── Cargos
├── Voluntários
├── Beneficiários
└── Telefones

Projetos
└── Projeto_Voluntários

Eventos
└── Inscrições
```

A modelagem continuará evoluindo conforme os requisitos dos módulos de:

* Usuários e permissões;
* Financeiro;
* Doações;
* Estoque;
* Patrimônio;
* Auditoria.

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

## 📚 Documentação

A documentação do projeto é mantida separadamente do código-fonte para facilitar a evolução dos requisitos.

Principais documentos:

* **PRD:** visão do produto, objetivos, requisitos e escopo;
* **Descrição da UI:** estrutura das telas, navegação, identidade visual e padrões de interface;
* **Modelagem do banco de dados:** entidades, relacionamentos e estrutura do banco;
* **Documentação técnica:** arquitetura, API e decisões de implementação.

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

A aplicação deverá considerar desde sua arquitetura inicial:

* Autenticação;
* Autorização baseada em perfis;
* Controle de acesso;
* Proteção de dados pessoais;
* Auditoria de operações críticas;
* Estratégia de backup;
* Preservação do histórico de ações relevantes.

---

## 🧪 Desenvolvimento

O projeto está sendo desenvolvido de maneira incremental, passando pelas seguintes etapas:

```text
Levantamento de requisitos
          │
          ▼
Documentação do produto
          │
          ▼
Modelagem do banco
          │
          ▼
Arquitetura técnica
          │
          ▼
Back-end / API
          │
          ▼
Front-end
          │
          ▼
Integração
          │
          ▼
Testes
          │
          ▼
Implantação
```

---

## 📈 Critérios iniciais de sucesso

A primeira versão será considerada funcional quando a associação conseguir:

* Acessar o sistema com segurança;
* Gerenciar usuários;
* Cadastrar membros;
* Cadastrar voluntários;
* Cadastrar beneficiários;
* Gerenciar projetos;
* Criar e visualizar eventos;
* Controlar inscrições;
* Registrar receitas;
* Registrar despesas;
* Anexar comprovantes;
* Visualizar informações financeiras;
* Controlar permissões;
* Consultar informações através dos dashboards;
* Gerar os relatórios previstos para a primeira versão.

---

## 🤝 Projeto

**Sistema de Gestão da Associação Cristã Pau-Brasil**

Desenvolvido com o objetivo de fornecer à ACPB uma ferramenta centralizada para organização, gestão e acompanhamento de suas atividades.

---

