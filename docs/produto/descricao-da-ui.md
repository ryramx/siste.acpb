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

# 1.1 Paleta e tokens de cor

> Esta seção descreve o que está **implementado**. A fonte da verdade é o bloco `@theme` de
> [`src/index.css`](../../src/index.css); aqui ficam o papel de cada cor e os números que
> justificam os valores. Componente nenhum deve escrever cor em hexadecimal: use o token, e
> acrescente um novo ao `@theme` quando faltar.

O tema é escuro, com duas superfícies (fundo e cartão), o verde institucional da associação e o
amarelo como cor de destaque.

| Token | Valor | Papel |
| --- | --- | --- |
| `surface-bg` | `#0F1210` | Fundo da aplicação |
| `surface-card` | `#181D1A` | Cartões, modais, cabeçalho de tabela |
| `surface-card-hover` | `#1E2521` | Linha de tabela sob o cursor |
| `surface-border` | `#222824` | Bordas e divisores |
| `surface-border-hover` | `#2C332E` | Realce de borda/superfície no hover |
| `surface-input` | `#151917` | Fundo de campo de formulário |
| `acpb-green` | `#004922` | Marca. **Preenchimento**: botão primário, borda, faixa |
| `acpb-green-hover` / `acpb-green-dark` | `#00632E` / `#003318` | Estados do botão primário |
| `acpb-green-fg` | `#2E9E5B` | Marca em **primeiro plano**: ícone e texto sobre o escuro |
| `acpb-yellow` | `#F8D800` | Destaque, ícone de título, botão secundário |
| `acpb-yellow-hover` / `acpb-yellow-dark` | `#E0C300` / `#B8A000` | Estados do botão secundário |
| `valor-positivo` | `#40C075` | Dinheiro que entra, nas telas financeiras |
| `text-primary` | `#FFFFFF` | Texto principal |
| `text-secondary` | `#AEB5B0` | Texto de apoio, rótulos, células secundárias |
| `text-muted` | `#8A928B` | Textos pequenos explicativos, placeholders |

## Contraste medido

Os valores foram calculados pela fórmula de contraste da WCAG 2.1 contra as duas superfícies do
tema. O piso adotado é **4,5:1**, que é o exigido para texto pequeno — mais rígido do que os 3:1
que bastariam para ícones, para que a mesma cor possa ser usada nos dois casos sem recalcular.

| Cor | Sobre `surface-card` | Sobre `surface-bg` |
| --- | --- | --- |
| `text-primary` | 17,08:1 | 18,85:1 |
| `acpb-yellow` | 12,05:1 | 13,29:1 |
| `text-secondary` | 8,16:1 | 9,01:1 |
| `valor-positivo` | 7,33:1 | 8,09:1 |
| `text-muted` | 5,34:1 | 5,89:1 |
| `acpb-green-fg` | 5,01:1 | 5,53:1 |
| `text-primary` sobre `acpb-green` (botão) | 10,63:1 | — |

## Duas correções, e o motivo de cada uma

**O verde institucional não serve como primeiro plano.** `#004922` sobre o fundo do sistema dá
**1,77:1** — um ícone desenhado com ele praticamente desaparece. Era o que acontecia nos títulos
de Membros, Projetos e Beneficiários, no indicador do dashboard e no ícone de sucesso dos avisos.
O mesmo verde é ótimo como **fundo** de botão com texto branco (10,63:1), que é o uso para o qual
ele foi escolhido. Daí a separação em dois tokens: `acpb-green` preenche, `acpb-green-fg`
escreve.

**O cinza auxiliar estava abaixo do piso.** `#727A74` dava **3,86:1** sobre o cartão, e é
justamente a cor dos textos pequenos que explicam o que cada tela faz — quem mais precisa deles
é quem está usando o sistema pela primeira vez. Clareado para `#8A928B`, chega a 5,34:1 mantendo
a hierarquia visual em relação ao `text-secondary`.

## Por que tokens, e não hexadecimal nos componentes

O `@theme` já existia desde o início, mas os componentes escreviam a cor direto na classe
(`text-[#AEB5B0]`) — 855 ocorrências. O efeito prático era que clarear um cinza deixava de ser
uma linha e virava 53 edições espalhadas, com risco de esquecer alguma e produzir duas variações
do mesmo cinza na mesma tela.

A migração foi conferida comparando as cores presentes no CSS **gerado pelo build** antes e
depois: a única diferença é a entrada das duas cores corrigidas acima. Nenhuma tela mudou de
aparência sem intenção.

Duas exceções continuam em hexadecimal, com motivo: as cores de fundo do avatar sem foto
(`Avatar.tsx`), que são escolhidas em JavaScript a partir do nome da pessoa e por isso não podem
ser classes utilitárias; e o branco do recorte de imagem em canvas (`utils/imagem.ts`), que é
argumento de API do navegador, não estilo.

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
Período: [2026 ▼] [Todos os meses ▼]      ← topo do Financeiro, vale para todas as abas

┌────────────┬────────────┬────────────┬──────────────┐
│ Receitas   │ Despesas   │ Resultado  │ Saldo em     │
│ R$ 8.420   │ R$ 6.830   │ R$ 1.590   │ caixa        │
│            │            │ no período │ R$ 12.090    │
└────────────┴────────────┴────────────┴──────────────┘

┌─────────────────────────────────────────────────┐
│ Receitas e despesas por mês      ▪Receitas ▪Desp│
│ 10 mil ┤                                        │
│  5 mil ┤   ▌▌   ▌▌   ▌▌   ▌▌   ▌▌   ▌▌          │
│      0 ┼───────────────────────────────────     │
│         abr  mai  jun  jul  ago  set            │
│ Ver os mesmos dados em tabela                   │
└─────────────────────────────────────────────────┘

┌───────────────────────────┐ ┌───────────────────────────┐
│ Receitas por categoria    │ │ Despesas por categoria    │
│ Doações   ███████ R$ 5.2k │ │ Aluguel  ██████ R$ 1.2k   │
│ Eventos   ████    R$ 2.1k │ │ Material ████   R$ 800    │
└───────────────────────────┘ └───────────────────────────┘
```

## Decisões dos gráficos

**Colunas agrupadas, não linhas, na evolução mensal.** A pergunta que a diretoria faz é "neste
mês entrou mais do que saiu?" — uma comparação *dentro* de cada mês, que duas barras lado a lado
respondem de relance. Linha responde melhor a "a tendência está subindo?", que é a pergunta
secundária aqui.

**Barra, não pizza, na composição por categoria.** Comparar comprimento é mais preciso que
comparar ângulo, e a lista de categorias da associação passa de meia dúzia — em fatias, as
menores viram lascas sem rótulo. Horizontal porque nome de categoria é texto longo, que na
vertical só caberia girado.

**Uma cor por gráfico de categoria, não uma por categoria.** O nome já está escrito ao lado da
barra e o comprimento já diz o tamanho; colorir cada uma gastaria o canal de cor repetindo
informação que a barra já carrega.

**O par de cores das séries foi validado, não escolhido a olho.** Verde e vermelho puros — o
óbvio para entrada e saída — ficam a ΔE 1,6 sob deuteranopia: para uma parte dos leitores seriam
a mesma cor, lado a lado na mesma barra. O par em uso (`serie-receita` / `serie-despesa`) fica
em ΔE 6,9, dentro da banda que exige **codificação secundária** — e ela está presente: legenda
sempre visível, posição fixa no par (receita sempre à esquerda), a dica ao passar o mouse e a
tabela equivalente. Os valores em texto do resto da tela continuam em verde e vermelho
tradicionais: eles nunca aparecem encostados um no outro, então o problema não existe lá.

**Todo número do gráfico existe fora dele.** Cada mês tem rótulo acessível com os três valores,
e o botão "ver os mesmos dados em tabela" abre a tabela equivalente. Gráfico que só entrega o
número ao passar o mouse exclui quem usa teclado, leitor de tela ou celular.

**O período é um filtro só, acima de tudo.** É o seletor de ano e mês do topo do Financeiro, o
mesmo dos cartões e da lista; os gráficos não têm filtro próprio. A primeira versão tinha botões
"6 meses / 12 meses / este ano / tudo" só para os gráficos, e a tela chegou a ter dois filtros
que podiam discordar — números que discordam entre si por causa de filtros separados são pior
do que número nenhum. A evolução mensal mostra o ano escolhido, de janeiro até o mês atual,
mesmo com um mês selecionado: um mês sozinho seria uma coluna só, e a pergunta do gráfico é a
comparação entre meses. As categorias seguem o período exato. Enquanto recarrega, o gráfico
anterior fica esmaecido em vez de virar esqueleto, para a tela não saltar.

**Resultado e saldo em caixa são dois cartões.** O resultado (receitas − despesas) segue o
período; o saldo em caixa não — é o dinheiro que existe hoje, contando o saldo inicial das
contas — e vem da mesma rota do dashboard geral, que usa o mesmo nome. Antes um cartão chamado
"disponível em caixa" mostrava o resultado, e o dashboard geral mostrava o saldo com o mesmo
nome e outro valor.

**As categorias mostram as 5 maiores**, com "Ver todas": despesas têm 15 no cadastro padrão, e
a lista inteira empurrava o resto da tela. O percentual tem duas casas, e "< 0,01%" para o que
existe mas é pequeno — arredondar para inteiro mostrava 0% em categoria com dinheiro.

**As agregações vêm do banco, não do navegador.** `GET /dashboard/financeiro/evolucao` e
`/por-categoria` somam no Postgres. Somar no cliente exigiria carregar a lista inteira de
lançamentos, o que deixa de funcionar quando ela crescer.


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