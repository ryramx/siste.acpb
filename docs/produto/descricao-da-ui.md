# Descrição da UI

## Sistema de Gestão da Associação Cristã Pau-Brasil

**Produto:** Sistema de Gestão da Associação Cristã Pau-Brasil

**Tipo:** Aplicação Web responsiva

**Versão:** 0.1

**Documento:** Descrição da Interface

---

# 1. Diretrizes gerais da interface

A interface deverá priorizar:

- simplicidade;
- clareza;
- facilidade de navegação;
- acessibilidade;
- responsividade;
- consistência visual;
- segurança na apresentação de informações;
- redução da quantidade de etapas para tarefas frequentes.

O sistema será utilizado principalmente por pessoas responsáveis pela gestão da associação, portanto a interface deverá privilegiar **informação organizada e produtividade**, evitando excesso de elementos visuais.

---

# 2. Estrutura geral da aplicação

Após o login, o sistema deverá apresentar uma estrutura composta por:

```
┌───────────────────────────────────────────────────────────┐
│ LOGO / ASSOCIAÇÃO                         🔔  👤 Usuário │
├──────────────┬────────────────────────────────────────────┤
│              │                                            │
│ 🏠 Dashboard │                                            │
│              │                                            │
│ 👥 Pessoas   │                                            │
│   Membros    │             ÁREA PRINCIPAL                 │
│   Voluntários│                                            │
│   Beneficiários                                         │
│              │                                            │
│ 📁 Projetos  │                                            │
│              │                                            │
│ 📅 Eventos   │                                            │
│              │                                            │
│ 💰 Financeiro│                                            │
│              │                                            │
│ 📦 Estoque   │                                            │
│              │                                            │
│ 🏢 Patrimônio│                                            │
│              │                                            │
│ 📊 Relatórios│                                            │
│              │                                            │
│ ⚙️ Configurações│                                        │
│              │                                            │
│ 🚪 Sair      │                                            │
└──────────────┴────────────────────────────────────────────┘
```

### Elementos principais

**Barra lateral**

Responsável pela navegação entre os módulos.

**Barra superior**

Deverá apresentar:

- identificação da associação;
- notificações, quando disponíveis;
- usuário atualmente conectado;
- acesso ao perfil;
- opção de sair.

**Área principal**

Exibirá o conteúdo correspondente à seção selecionada.

---

# 3. Responsividade

A aplicação deverá ser responsiva.

### Desktop

Utilização de:

- sidebar fixa;
- tabelas;
- dashboards;
- múltiplos cards;
- gráficos.

### Tablet

A sidebar poderá ser recolhida.

### Smartphone

A navegação deverá ser adaptada para uma interface compacta.

Exemplo:

```
┌─────────────────────────┐
│ ☰   Pau-Brasil     👤  │
├─────────────────────────┤
│                         │
│       Dashboard         │
│                         │
│ ┌─────────┐ ┌─────────┐ │
│ │ Membros │ │ Volunt. │ │
│ │   127   │ │   43    │ │
│ └─────────┘ └─────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Próximos eventos    │ │
│ │                     │ │
│ │ 📅 Reunião          │ │
│ │ 📅 Acampamento      │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

# 4. Tela de Login

A primeira tela apresentada ao usuário será a tela de autenticação.

```
┌──────────────────────────────────┐
│                                  │
│          [LOGO]                  │
│                                  │
│      Associação Pau-Brasil       │
│                                  │
│  E-mail                          │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  Senha                           │
│  ┌────────────────────────────┐  │
│  │ •••••••••••                👁│  │
│  └────────────────────────────┘  │
│                                  │
│      Esqueci minha senha         │
│                                  │
│  ┌────────────────────────────┐  │
│  │          ENTRAR             │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

### Estados

A interface deverá apresentar mensagens para:

- credenciais inválidas;
- usuário inativo;
- campos obrigatórios;
- erro de conexão;
- recuperação de senha.

---

# 5. Dashboard

Após o login, o usuário será direcionado ao Dashboard.

O conteúdo deverá variar conforme suas permissões.

### Dashboard administrativo

```
┌─────────────────────────────────────────────────┐
│ Bom dia, João!                                  │
│ Aqui está o resumo da associação.               │
├───────────┬───────────┬───────────┬─────────────┤
│ Membros   │ Voluntários│Beneficiários│ Projetos │
│   127     │    43      │    218      │    8     │
└───────────┴───────────┴───────────┴─────────────┘

┌──────────────────────┐ ┌──────────────────────┐
│ Próximos eventos     │ │ Situação financeira  │
│                      │ │                      │
│ 📅 Reunião           │ │ Receitas R$ 8.420    │
│ 📅 Mutirão           │ │ Despesas R$ 6.830    │
│ 📅 Acampamento       │ │ Saldo    R$ 1.590    │
└──────────────────────┘ └──────────────────────┘

┌─────────────────────────────────────────────────┐
│ Atividades recentes                             │
│                                                 │
│ João cadastrou membro                          │
│ Maria criou evento                              │
│ Ana registrou despesa                           │
└─────────────────────────────────────────────────┘
```

---

# 6. Módulo de Pessoas

O menu **Pessoas** poderá conter:

```
Pessoas
├── Membros
├── Voluntários
└── Beneficiários
```

A interface deverá permitir alternar entre esses cadastros sem perder a organização do sistema.

---

# 7. Tela de Membros

A tela deverá apresentar:

```
┌──────────────────────────────────────────────────┐
│ Membros                          [+ Novo membro] │
├──────────────────────────────────────────────────┤
│ 🔎 Buscar por nome, CPF...                       │
│                                                  │
│ Status ▼   Projeto ▼                            │
├──────────────────────────────────────────────────┤
│ Nome       Telefone    Projeto       Status      │
│                                                  │
│ João       819...      Projeto X     ● Ativo     │
│ Maria      819...      Educação      ● Ativo     │
│ Carlos     819...      Projeto Y     ● Afastado  │
└──────────────────────────────────────────────────┘
```

Cada registro deverá permitir:

- visualizar;
- editar;
- alterar situação;
- acessar detalhes.

---

# 8. Cadastro de membro

O formulário poderá ser dividido em blocos.

### Informações pessoais

- nome;
- foto;
- data de nascimento;
- CPF.

### Contato

- telefone;
- WhatsApp;
- e-mail.

### Endereço

- CEP;
- endereço;
- número;
- complemento;
- bairro;
- cidade;
- estado.

### Associação

- data de entrada;
- situação;
- projeto;
- observações.

### Responsável

Exibido quando o membro for menor de idade.

---

# 9. Tela de detalhes do membro

Ao selecionar um membro, o sistema deverá apresentar uma visão detalhada.

```
┌─────────────────────────────────────────────┐
│ ← Membros                                   │
│                                             │
│       [ FOTO ]                              │
│       João da Silva                         │
│       ● Ativo                               │
│                                             │
│ [Editar]                                    │
├─────────────────────────────────────────────┤
│ Informações pessoais                        │
│                                             │
│ Data de nascimento: 10/04/2000              │
│ CPF: xxx.xxx.xxx-xx                         │
│                                             │
│ Contato                                     │
│ Telefone: ...                               │
│ WhatsApp: ...                               │
│ E-mail: ...                                 │
├─────────────────────────────────────────────┤
│ Projetos                                    │
│ Projeto X                                   │
└─────────────────────────────────────────────┘
```

---

# 10. Tela de Voluntários

A interface deverá destacar informações úteis para gestão de voluntariado.

```
┌──────────────────────────────────────────────┐
│ Voluntários                    [+ Voluntário] │
├──────────────────────────────────────────────┤
│ 🔎 Buscar                                    │
│                                              │
│ Área ▼  Disponibilidade ▼  Projeto ▼         │
├──────────────────────────────────────────────┤
│ Maria                                        │
│ Educação                                     │
│ Reforço escolar                              │
│ Terça e quinta                               │
│                                              │
│ João                                         │
│ Esportes                                     │
│ Treinamento                                  │
│ Segunda e quarta                             │
└──────────────────────────────────────────────┘
```

---

# 11. Tela de Beneficiários

Por possuir informações potencialmente mais restritas, a interface deverá apresentar acesso controlado.

A tela deverá permitir:

- busca;
- filtros;
- cadastro;
- visualização;
- edição;
- histórico de atendimentos.

---

# 12. Histórico de atendimentos

Na página do beneficiário deverá existir uma área de histórico.

```
┌───────────────────────────────────────────┐
│ Histórico de atendimentos                 │
├───────────────────────────────────────────┤
│ 16/08/2026                                │
│ Atendimento social                        │
│ Responsável: Ana                          │
│                                           │
│ 09/08/2026                                │
│ Entrega de cesta básica                   │
│ Responsável: João                         │
│                                           │
│ 02/08/2026                                │
│ Atendimento psicológico                   │
│ Responsável: Maria                        │
└───────────────────────────────────────────┘
```

---

# 13. Projetos

A tela inicial deverá apresentar os projetos cadastrados.

```
┌────────────────────────────────────────────────┐
│ Projetos                         [+ Novo projeto]│
├────────────────────────────────────────────────┤
│                                                │
│ ┌────────────────┐ ┌────────────────┐          │
│ │ Reforço escolar│ │ Cestas básicas │          │
│ │                │ │                │          │
│ │ 74 beneficiários│ │ 120 beneficiários│        │
│ │ ● Ativo        │ │ ● Ativo        │          │
│ └────────────────┘ └────────────────┘          │
└────────────────────────────────────────────────┘
```

---

# 14. Detalhes do projeto

Cada projeto deverá possuir uma página própria.

```
┌───────────────────────────────────────────────┐
│ Projeto Reforço Escolar       ● Ativo         │
│ Responsável: Maria                            │
├───────────────────────────────────────────────┤
│ Visão geral                                   │
│                                               │
│ Beneficiários: 74                             │
│ Voluntários: 12                               │
│                                               │
├───────────────────────────────────────────────┤
│ Beneficiários | Voluntários | Eventos | Financeiro │
├───────────────────────────────────────────────┤
│                                               │
│ Conteúdo da aba selecionada                  │
│                                               │
└───────────────────────────────────────────────┘
```

---

# 15. Agenda

A agenda será uma das principais telas do sistema.

```
┌─────────────────────────────────────────────────────┐
│ Agenda                           [+ Novo evento]     │
├─────────────────────────────────────────────────────┤
│      < Agosto 2026 >                                │
│                                                     │
│ Dom Seg Ter Qua Qui Sex Sáb                         │
│                       1   2                         │
│  3   4   5   6   7   8   9                         │
│ 10  11  12  13  14  15  16                         │
│ 17  18  19  20  21  22  23                         │
│ 24  25  26  27  28  29  30                         │
│ 31                                                  │
├─────────────────────────────────────────────────────┤
│ Próximos eventos                                    │
│                                                     │
│ 📅 Reunião de voluntários                          │
│    02/08 • 19:00                                   │
│                                                     │
│ 🏕️ Acampamento Pau-Brasil                          │
│    15/09 • 08:00                                   │
└─────────────────────────────────────────────────────┘
```

---

# 16. Detalhes do evento

```
┌─────────────────────────────────────────────┐
│ 🏕️ Acampamento Pau-Brasil                   │
│                                             │
│ 15/09/2026                                  │
│ 08:00                                       │
│ Local: Sítio Pau-Brasil                    │
├─────────────────────────────────────────────┤
│ Descrição                                  │
│ Evento destinado aos participantes...       │
│                                             │
│ Responsável: João                           │
│ Público: Crianças e adolescentes            │
│                                             │
│ Vagas                                       │
│ 37 / 50 inscritos                           │
│                                             │
│ [Ver inscrições]                            │
└─────────────────────────────────────────────┘
```

---

# 17. Inscrições

A página de inscrições deverá apresentar:

```
┌─────────────────────────────────────────────┐
│ Inscrições                                  │
│ Acampamento Pau-Brasil                      │
├─────────────────────────────────────────────┤
│ Vagas: 50                                   │
│ Inscritos: 37                               │
│ Disponíveis: 13                             │
├─────────────────────────────────────────────┤
│ Participante     Data       Status           │
│                                             │
│ João             01/08      Confirmado       │
│ Maria            02/08      Confirmado       │
│ Carlos           03/08      Pendente         │
└─────────────────────────────────────────────┘
```

---

# 18. Financeiro

O módulo financeiro deverá possuir sua própria navegação.

```
Financeiro
├── Dashboard
├── Receitas
├── Despesas
├── Categorias
└── Movimentações
```

---

# 19. Dashboard financeiro

```
┌─────────────────────────────────────────────────┐
│ Dashboard Financeiro                            │
├──────────────┬──────────────┬───────────────────┤
│ Receitas     │ Despesas     │ Saldo             │
│ R$ 8.420     │ R$ 6.830     │ R$ 1.590          │
└──────────────┴──────────────┴───────────────────┘

┌─────────────────────────┐
│ Receitas por categoria  │
│                         │
│ Doações      █████████  │
│ Eventos      ████       │
│ Convênios    ██████     │
└─────────────────────────┘

┌─────────────────────────┐
│ Despesas por categoria  │
│                         │
│ Projetos     ███████    │
│ Aluguel      █████      │
│ Energia      ███        │
│ Alimentação  ████       │
└─────────────────────────┘
```

---

# 20. Receitas e despesas

A interface deverá utilizar tabelas com filtros.

```
┌────────────────────────────────────────────────┐
│ Despesas                       [+ Nova despesa] │
├────────────────────────────────────────────────┤
│ 🔎 Buscar                                      │
│ Categoria ▼   Projeto ▼   Período ▼            │
├────────────────────────────────────────────────┤
│ Data     Categoria    Valor       Status       │
│                                                │
│ 15/08    Energia      R$ 387,42   Pago         │
│ 18/08    Aluguel      R$ 1.500    Pago         │
│ 20/08    Alimentação  R$ 850      Pendente     │
└────────────────────────────────────────────────┘
```

---

# 21. Cadastro financeiro

O formulário deverá conter:

- tipo;
- categoria;
- valor;
- data;
- descrição;
- forma de pagamento;
- responsável;
- projeto;
- status;
- anexo.

O upload deverá permitir visualizar o documento anexado.

---

# 22. Patrimônio

A interface deverá permitir visualizar os bens cadastrados.

```
┌──────────────────────────────────────────────┐
│ Patrimônio                     [+ Novo bem]  │
├──────────────────────────────────────────────┤
│ 🔎 Buscar                                    │
│ Categoria ▼  Status ▼  Local ▼               │
├──────────────────────────────────────────────┤
│ Código     Bem          Local       Status   │
│                                              │
│ PAT-00023  Notebook     Escritório  Em uso  │
│ PAT-00024  Projetor     Sala 2      Em uso  │
└──────────────────────────────────────────────┘
```

---

# 23. Estoque

A interface deverá apresentar os produtos e seus níveis atuais.

```
┌──────────────────────────────────────────────┐
│ Estoque                      [+ Novo produto] │
├──────────────────────────────────────────────┤
│ 🔎 Buscar                                    │
├──────────────────────────────────────────────┤
│ Produto             Quantidade    Status     │
│                                              │
│ Arroz 5kg           42            Normal     │
│ Feijão              31            Normal     │
│ Material limpeza    17            Baixo      │
└──────────────────────────────────────────────┘
```

---

# 24. Movimentação de estoque

Ao acessar um produto:

```
Produto: Arroz 5kg

Estoque atual: 42

[+ Entrada]    [- Saída]

Histórico

30/08  Entrada  +30
28/08  Saída    -10
20/08  Entrada  +22
```

---

# 25. Doações

A tela de doações deverá apresentar:

```
┌───────────────────────────────────────────────┐
│ Doações                         [+ Nova doação]│
├───────────────────────────────────────────────┤
│ 🔎 Buscar                                      │
│ Período ▼  Projeto ▼                          │
├───────────────────────────────────────────────┤
│ Doador       Data       Valor      Projeto     │
│                                               │
│ João         20/08      R$ 500     Reforço     │
│ Maria        22/08      R$ 200     Geral       │
└───────────────────────────────────────────────┘
```

---

# 26. Relatórios

O módulo deverá possuir uma interface centralizada para geração de relatórios.

```
┌─────────────────────────────────────────────┐
│ Relatórios                                  │
├─────────────────────────────────────────────┤
│                                             │
│ 👥 Pessoas                                  │
│    Relatório de membros                     │
│    Relatório de voluntários                 │
│    Relatório de beneficiários               │
│                                             │
│ 💰 Financeiro                                │
│    Receitas e despesas                      │
│    Fluxo financeiro                         │
│    Despesas por projeto                     │
│                                             │
│ 📁 Projetos                                 │
│    Participantes                            │
│    Custos                                   │
│                                             │
│ 📅 Eventos                                  │
│    Inscrições                               │
│                                             │
│ 📦 Estoque                                  │
│    Movimentações                            │
└─────────────────────────────────────────────┘
```

O usuário deverá selecionar:

- relatório;
- período;
- filtros;
- formato de exportação.

---

# 27. Auditoria

A interface de auditoria deverá apresentar uma linha do tempo das ações.

```
┌───────────────────────────────────────────────┐
│ Auditoria                                     │
├───────────────────────────────────────────────┤
│ 🔎 Buscar                                     │
│ Usuário ▼  Módulo ▼  Período ▼                │
├───────────────────────────────────────────────┤
│                                               │
│ 30/08 19:43                                   │
│ João alterou uma despesa                      │
│ R$ 500 → R$ 650                               │
│                                               │
│ 30/08 18:20                                   │
│ Maria cadastrou um novo evento                │
│                                               │
│ 29/08 14:12                                   │
│ Ana cadastrou um beneficiário                 │
└───────────────────────────────────────────────┘
```

---

# 28. Configurações

A área de configurações deverá ser acessível somente a usuários autorizados.

Possíveis categorias:

```
Configurações
│
├── Usuários
├── Perfis e permissões
├── Categorias financeiras
├── Categorias de eventos
├── Tipos de atendimento
├── Categorias de patrimônio
├── Categorias de estoque
└── Dados da associação
```

---

# 29. Estados da interface

Todas as telas deverão prever estados comuns.

### Carregando

```
Carregando informações...
```

Preferencialmente utilizando skeleton loading.

### Sem dados

```
Ainda não existem membros cadastrados.

[+ Cadastrar membro]
```

### Erro

```
Não foi possível carregar as informações.

[Tentar novamente]
```

### Sucesso

```
✓ Membro cadastrado com sucesso.
```

### Confirmação

Operações destrutivas ou críticas deverão solicitar confirmação.

Exemplo:

> Tem certeza que deseja desativar este membro?
> 

---

# 30. Componentes visuais padronizados

Para manter consistência, o sistema deverá possuir componentes reutilizáveis:

- botões;
- inputs;
- selects;
- campos de busca;
- filtros;
- tabelas;
- cards;
- modais;
- badges de status;
- menus;
- abas;
- paginação;
- upload de arquivos;
- calendário;
- gráficos;
- notificações;
- mensagens de confirmação.

---

# 31. Padrão de navegação

A navegação deverá seguir uma hierarquia consistente.

Exemplo:

```
Dashboard
   ↓
Pessoas
   ↓
Membros
   ↓
João da Silva
   ↓
Editar membro
```

O usuário deverá conseguir retornar às telas anteriores através de:

- breadcrumb;
- botão voltar;
- menu lateral.

---

# 32. Identidade Visual

A interface do sistema deverá utilizar como referência principal a identidade visual da **Associação Cristã Pau-Brasil (ACPB)**, tomando como base o logotipo e a comunicação visual utilizada nos canais oficiais da associação.

A identidade deverá transmitir:

- confiança;
- organização;
- seriedade;
- acolhimento;
- caráter social;
- identidade cristã;
- conexão com a comunidade.

## 32.1 Logotipo

O logotipo oficial da Associação Cristã Pau-Brasil deverá ser utilizado como elemento principal de identificação da aplicação.

Aplicações previstas:

- tela de login;
- cabeçalho;
- menu lateral;
- favicon;
- documentos e relatórios;
- telas institucionais.

O sistema deverá utilizar preferencialmente o arquivo original do logotipo em boa resolução, evitando recriação ou alteração do símbolo.

---

## 32.2 Paleta de cores

A paleta deverá ser derivada das cores presentes no logotipo e na comunicação visual apresentada pela associação.

### Cores institucionais

| Cor | HEX | Função |
| --- | --- | --- |
| 🟢 Verde ACPB | `#004922` | Cor primária da aplicação |
| 🟡 Amarelo ACPB | `#F8D800` | Cor de destaque |

### Cores neutras

| Cor | HEX | Função |
| --- | --- | --- |
| ⚪ Branco | `#FFFFFF` | Texto, contraste e superfícies |
| 🌑 Fundo escuro | `#0F1210` | Fundo principal |
| ◼️ Surface | `#181D1A` | Cards e áreas elevadas |
| ◼️ Surface 2 | `#222824` | Elementos secundários |
| ⚪ Texto secundário | `#AEB5B0` | Informações auxiliares |

---

## 32.3 Direção visual

A interface deverá seguir uma estética **moderna, limpa e institucional**, utilizando a identidade da associação sem transformar o sistema em uma extensão visual de uma rede social.

A referência visual deverá ser:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ACPB     Sistema de Gestão             🔔  👤     │
│                                                     │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│ 🏠 Dashboard  │        CONTEÚDO                    │
│               │                                     │
│ 👥 Pessoas    │   ┌────────┐ ┌────────┐ ┌────────┐│
│               │   │ Membros│ │Volunt. │ │Benefic.││
│ 📁 Projetos   │   │  127   │ │   43   │ │  218   ││
│               │   └────────┘ └────────┘ └────────┘│
│ 📅 Eventos    │                                     │
│               │   Próximos eventos                 │
│ 💰 Financeiro │   ─────────────────────────────     │
│               │                                     │
│ 📦 Estoque    │                                     │
│               │                                     │
│ 🏢 Patrimônio │                                     │
│               │                                     │
│ 📊 Relatórios │                                     │
│               │                                     │
└───────────────┴─────────────────────────────────────┘
```

---

## 32.4 Tema da aplicação

A aplicação deverá priorizar inicialmente um **tema escuro**, inspirado na presença digital atual da associação.

### Estrutura de cores

```
FUNDO PRINCIPAL
#0F1210

SUPERFÍCIES
#181D1A

SUPERFÍCIES SECUNDÁRIAS
#222824

COR PRIMÁRIA
#004922

COR DE DESTAQUE
#F8D800

TEXTO PRINCIPAL
#FFFFFF

TEXTO SECUNDÁRIO
#AEB5B0
```

O verde será utilizado principalmente em:

- botões principais;
- elementos selecionados;
- links;
- indicadores positivos;
- elementos de identidade;
- destaques da navegação.

O amarelo será utilizado principalmente em:

- elementos de destaque;
- indicadores importantes;
- pequenos detalhes visuais;
- determinados estados de atenção, quando apropriado.

---

## 32.5 Logo e elementos da interface

O logotipo poderá aparecer de duas formas:

### Sidebar expandida

```
┌─────────────────────┐
│                     │
│      [ LOGO ACPB ]  │
│                     │
│  Sistema de Gestão  │
│                     │
├─────────────────────┤
│ 🏠 Dashboard        │
│ 👥 Pessoas          │
│ 📁 Projetos         │
│ 📅 Eventos          │
│ 💰 Financeiro       │
│ 📦 Estoque          │
│ 🏢 Patrimônio       │
│ 📊 Relatórios       │
└─────────────────────┘
```

### Sidebar recolhida

Apenas o símbolo/logotipo reduzido poderá permanecer visível.

---

## 32.6 Tipografia

A aplicação deverá utilizar uma tipografia moderna e de alta legibilidade.

A hierarquia deverá ser:

**Título da página**

> Dashboard
> 

**Título de seção**

> Próximos eventos
> 

**Informação**

> Acampamento Pau-Brasil
> 

**Texto auxiliar**

> 15/09/2026 às 08:00
> 

A tipografia deverá manter boa legibilidade tanto em desktop quanto em dispositivos móveis.

---

## 32.7 Cards e componentes

Os componentes deverão utilizar prioritariamente tons neutros da interface, com o verde ACPB utilizado para ações primárias e elementos selecionados.

Exemplo:

```
┌─────────────────────────┐
│ Membros                 │
│                         │
│ 127                     │
│                         │
│ ↑ 8 este mês            │
└─────────────────────────┘
```

Os componentes deverão possuir:

- bordas discretas;
- cantos levemente arredondados;
- espaçamento consistente;
- hierarquia visual clara;
- estados de hover;
- estados de foco;
- estados de seleção.

---

## 32.8 Botões

### Botão primário

Utilizar o **Verde ACPB `#004922`**.

```
┌─────────────────────────┐
│      + Novo membro      │
└─────────────────────────┘
```

### Botão secundário

Utilizar tons neutros da interface.

### Botão de destaque

Quando necessário, poderá utilizar o **Amarelo ACPB `#F8D800`**, desde que haja contraste adequado com o texto.

### Ações destrutivas

Utilizar vermelho exclusivamente para indicar ações críticas.

---

## 32.9 Status

Os status deverão utilizar indicadores visuais associados ao significado.

| Status | Cor |
| --- | --- |

| 🟢 Ativo | Verde |
| --- | --- |

| 🟡 Pendente | Amarelo |
| --- | --- |

| 🔵 Informativo | Azul |
| --- | --- |

| ⚪ Inativo | Cinza |
| --- | --- |

| 🔴 Cancelado/Erro | Vermelho |
| --- | --- |

Além da cor, o status deverá possuir texto, garantindo acessibilidade para usuários que tenham dificuldade de distinguir cores.

---

## 32.10 Gráficos

Os gráficos deverão utilizar prioritariamente o Verde ACPB e o Amarelo ACPB, complementados por tons neutros da interface.

No dashboard financeiro, por exemplo:

```
Receitas
████████████████████

Despesas
████████████

Saldo
████████
```

A quantidade de cores deverá ser limitada para preservar a identidade visual e facilitar a leitura.

---

# 33. Referência visual

A identidade visual apresentada no logotipo oficial da Associação Cristã Pau-Brasil será considerada a principal referência para o desenvolvimento da interface.

Os principais elementos a serem preservados são:

- logotipo ACPB;
- Verde ACPB `#004922`;
- Amarelo ACPB `#F8D800`;
- branco;
- tons escuros;
- estética limpa e institucional.

A identidade será adaptada para o contexto de uma aplicação web administrativa, mantendo o reconhecimento visual da associação sem reproduzir literalmente a interface utilizada em suas redes sociais.

# 34. Mapa de telas

A aplicação poderá ser representada pelo seguinte mapa:

```
LOGIN
 │
 ▼
DASHBOARD
 │
 ├── PESSOAS
 │    ├── Membros
 │    │    ├── Lista
 │    │    ├── Cadastro
 │    │    └── Detalhes
 │    │
 │    ├── Voluntários
 │    │    ├── Lista
 │    │    ├── Cadastro
 │    │    └── Detalhes
 │    │
 │    └── Beneficiários
 │         ├── Lista
 │         ├── Cadastro
 │         ├── Detalhes
 │         └── Atendimentos
 │
 ├── PROJETOS
 │    ├── Lista
 │    ├── Cadastro
 │    └── Detalhes
 │
 ├── EVENTOS
 │    ├── Calendário
 │    ├── Cadastro
 │    ├── Detalhes
 │    └── Inscrições
 │
 ├── FINANCEIRO
 │    ├── Dashboard
 │    ├── Receitas
 │    ├── Despesas
 │    ├── Categorias
 │    └── Movimentações
 │
 ├── DOAÇÕES
 │
 ├── ESTOQUE
 │    ├── Produtos
 │    └── Movimentações
 │
 ├── PATRIMÔNIO
 │
 ├── RELATÓRIOS
 │
 ├── AUDITORIA
 │
 └── CONFIGURAÇÕES
      ├── Usuários
      ├── Permissões
      └── Configurações gerais
```

---

# 35. Fluxo principal do usuário

O fluxo básico será:

```
             ┌──────────┐
             │  LOGIN   │
             └────┬─────┘
                  │
                  ▼
             ┌──────────┐
             │DASHBOARD │
             └────┬─────┘
                  │
        ┌─────────┼──────────┐
        │         │          │
        ▼         ▼          ▼
     Pessoas   Eventos   Financeiro
        │         │          │
        ▼         ▼          ▼
     Cadastro  Inscrição  Movimentação
        │         │          │
        └─────────┼──────────┘
                  ▼
              RELATÓRIOS
```