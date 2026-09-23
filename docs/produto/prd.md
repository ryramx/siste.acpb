# PRD

- Prd feito por mim
    
    Precisamos de um sistema que atenda aos requisitos da Associação.
    
    Inicialmente precisaremos ter um sistema que tenha:
    
    1. Tela de Login, para que os usuários possam ter acesso ao sistema;
    2. Área de Cadastro de Usuários, contendo as informações necessárias para login e o perfil de acesso, que só poderá ser modificado, com o CRUD pelo Administrador.
    3. Área destinada para Cadastro de Membros da Associação.
    Será uma área com dados pessoais como: 
        - Nome completo;
        - Foto;
        - Data de nascimento;
        - CPF;
        - Telefone;
        - WhatsApp;
        - E-mail;
        - Endereço;
        - Data de entrada na associação;
        - Situação: ativo, inativo, afastado etc.
        - Observações;
        - Responsável, caso seja menor;
        - Área/projeto em que participa;
        - Data de cadastro;
    4. Área dedicada para cadastros de voluntários
        
        Uma pessoa pode estar cadastrada na associação sem necessariamente trabalhar voluntariamente nela.
        
        Poderíamos ter:
        
        - Áreas de atuação
        - Disponibilidade
        - Habilidades
        - Dias disponíveis
        - Projetos em que trabalha
        - Histórico de voluntariado
        - Horas trabalhadas
        
        Por exemplo:
        
        **Maria**
        
        - Voluntária: Sim
        - Área: Educação
        - Disponibilidade: Terça e quinta
        - Habilidade: Reforço escolar
        - Projeto: Crianças e adolescentes
    5. Agenda e Eventos
        
        Um calendário central:
        
        ```
                  AGOSTO 2026
        
        Dom  Seg  Ter  Qua  Qui  Sex  Sáb
                                 1    2
        3    4    5    6    7    8    9
                  │
                  └── Reunião de voluntários
        ```
        
        Cada evento poderia possuir:
        
        - Nome;
        - Descrição;
        - Data;
        - Horário;
        - Local;
        - Responsável;
        - Categoria;
        - Público-alvo;
        - Quantidade máxima de participantes;
        - Necessidade de inscrição;
        - Status.
        
        ### E aí surge uma funcionalidade muito boa:
        
        **Inscrição em eventos.**
        
        Exemplo:
        
        > 🏕️ Acampamento Pau-Brasil
        > 
        > 
        > 15/09/2026
        > 
        > Vagas: 50
        > 
        > Inscritos: 37
        > 
        
        O responsável consegue acompanhar os participantes.
        
    6. Dashboard de Gestão Financeira:
        
        Criar **categorias financeiras**.
        
        ### Receitas
        
        - Doações;
        - Contribuições;
        - Patrocínios;
        - Convênios;
        - Eventos;
        - Outras receitas.
        
        ### Despesas
        
        - Aluguel;
        - Energia;
        - Água;
        - Internet;
        - Material de limpeza;
        - Material de escritório;
        - Alimentação;
        - Transporte;
        - Manutenção;
        - Equipamentos;
        - Projetos sociais;
        - Contabilidade;
        - Impostos/taxas;
        - Outras despesas.
        
        E cada movimentação teria:
        
        ```
        Tipo: Despesa
        Categoria: Energia
        Valor: R$ 387,42
        Data: 15/08/2026
        Descrição: Conta de energia
        Forma: PIX
        Responsável: João
        Anexo: conta_agosto.pdf
        ```
        
        ### 📊 Dashboard
        
        Aí fica bonito.
        
        ```
        ┌──────────────────────────────────────────┐
        │        RESUMO FINANCEIRO - AGOSTO        │
        ├────────────┬────────────┬────────────────┤
        │ Receitas   │ Despesas   │ Saldo          │
        │ R$ 8.420   │ R$ 6.830   │ R$ 1.590       │
        └────────────┴────────────┴────────────────┘
        
        Receitas
        ████████████████████  Doações
        
        Despesas
        ██████████           Projetos
        ██████               Aluguel
        ████                 Energia
        ███                  Alimentação
        ```
        
        E uma coisa **muito importante**:
        
        ### 📎 Anexos financeiros
        
        Permitir anexar:
        
        - Nota fiscal
        - Recibo
        - Comprovante PIX
        - Boleto
        - Contrato
        - Conta de energia
        
        Isso ajudará bastante na **organização e prestação de contas**.
        
    7. Patrimônio
        
        A associação provavelmente possui:
        
        - Computadores
        - Mesas
        - Cadeiras
        - Projetores
        - Impressoras
        - Instrumentos
        - Equipamentos de cozinha
        - Ferramentas etc.
        
        Então:
        
        ```
        PATRIMÔNIO
        
        Notebook Dell
        Código: PAT-00023
        Aquisição: 12/03/2025
        Valor: R$ 3.200
        Local: Sala administrativa
        Responsável: João
        Status: Em uso
        ```
        
    8.  Projetos Sociais
        
        Em vez de enxergar somente "membros", o sistema poderia enxergar:
        
        **Projetos**
        
        Exemplo:
        
        ### Projeto Reforço Escolar
        
        - Responsável
        - Descrição
        - Público atendido
        - Local
        - Horários
        - Voluntários
        - Participantes
        - Recursos utilizados
        - Gastos
        - Eventos relacionados
        
        Isso permitiria responder:
        
        > "Quanto o projeto de reforço escolar custou nos últimos 6 meses?"
        > 
        
        E aí o sistema cruza:
        
        **Projeto → despesas → voluntários → participantes → eventos.**
        
    9. Criar uma distinção entre:
        
        **Membro**
        
        **Voluntário**
        
        **Beneficiário**
        
        Porque são conceitos diferentes.
        
        Uma pessoa pode receber atendimento sem ser membro da associação.
        
        Cadastro poderia conter:
        
        - Nome
        - Faixa etária
        - Projeto atendido
        - Data de entrada
        - Situação
        - Atendimentos realizados
        
        Dependendo do tipo de assistência oferecida, essa área pode envolver **dados pessoais sensíveis**, então eu trataria isso com permissões bem mais restritas.
        
    10. Registro de Atendimentos:
        
        Por exemplo:
        
        ```
        BENEFICIÁRIO: Carlos
        
        02/08
        Atendimento psicológico
        Responsável: Maria
        
        09/08
        Entrega de cesta básica
        Responsável: João
        
        16/08
        Atendimento social
        Responsável: Ana
        ```
        
        Isso permite construir um histórico.
        
    11. Comunicação
        
        Poderia existir um mural interno:
        
        ### 📢 Avisos
        
        > Mutirão de sábado
        > 
        
        > Reunião de voluntários
        > 
        
        > Alteração no horário do projeto
        > 
        
        > Campanha de arrecadação
        > 
        
        E futuramente integração com:
        
        - WhatsApp
        - E-mail
        - Push notification
        
        Não precisa entrar na primeira versão.
        
    12. Estoque
        
        Essa eu colocaria no projeto.
        
        Principalmente se a associação trabalha com doações.
        
        Exemplo:
        
        ```
        ESTOQUE
        
        Arroz 5kg
        Quantidade: 42
        
        Feijão
        Quantidade: 31
        
        Material de limpeza
        Quantidade: 17
        ```
        
        E o sistema poderia registrar:
        
        **Entrada**
        
        > Doação de 30 cestas.
        > 
        
        **Saída**
        
        > 10 cestas destinadas ao projeto X.
        > 
        
        Assim conseguimos saber **o que entrou, onde foi parar e quanto ainda existe**.
        
    13.  Doações
        
        Aqui temos outro módulo interessante.
        
        Uma doação poderia ter:
        
        ```
        Doador
        Valor
        Data
        Tipo
        Projeto destinado
        Forma de pagamento
        Comprovante
        ```
        
        E uma doação poderia ser:
        
        > R$ 500 destinados especificamente ao Projeto Reforço Escolar.
        > 
        
        Isso é diferente de uma receita genérica.
        
    
    ---
    
    1. Usuários e permissões
        
        **Essa parte é fundamental.**
        
        Nem todo mundo pode acessar tudo.
        
        Eu criaria algo parecido com:
        
        ### Administrador
        
        Acesso total.
        
        ### Financeiro
        
        ```
        Financeiro ✅
        Membros 👁️
        Eventos 👁️
        Projetos 👁️
        Configurações ❌
        ```
        
        ### Coordenador
        
        Pode administrar projetos e eventos.
        
        ### Voluntário
        
        Acesso limitado.
        
        ### Consulta
        
        Somente visualização.
        
    2. Auditoria
        
        Essa seria uma funcionalidade excelente.
        
        O sistema registra:
        
        ```
        30/08/2026 19:43
        João alterou uma despesa
        
        Valor anterior:
        R$ 500
        
        Novo valor:
        R$ 650
        ```
        
        Ou:
        
        ```
        Maria excluiu evento "Campanha de Inverno"
        ```
        
        Isso é extremamente útil para segurança e transparência.
        
        Eu evitaria inclusive **exclusões definitivas** para algumas informações financeiras. Melhor trabalhar com cancelamento/inativação e manter histórico.
        
    3.  Relatórios
        
        O sistema poderia gerar:
        
        ### Relatório financeiro
        
        ```
        Receitas: R$ 25.430
        Despesas: R$ 19.280
        Saldo: R$ 6.150
        ```
        
        ### Relatório de membros
        
        ```
        Membros ativos: 127
        Voluntários: 43
        Beneficiários: 218
        ```
        
        ### Relatório de projetos
        
        ```
        Projeto       Beneficiários    Custo
        Reforço       74               R$ 3.200
        Cestas        120              R$ 5.400
        ```
        
        E exportação:
        
        **PDF / Excel / CSV**
        

## Sistema de Gestão da Associação Cristã Pau-Brasil

**Produto:** Sistema de Gestão da Associação Cristã Pau-Brasil

**Tipo:** Aplicação Web

**Versão:** 0.1

**Status:** Em definição de requisitos

---

# 1. Visão do Produto

O sistema será uma aplicação web destinada à gestão da Associação Cristã Pau-Brasil, centralizando informações administrativas, sociais, financeiras e operacionais.

A aplicação permitirá o gerenciamento de pessoas, membros, voluntários, beneficiários, projetos, eventos, inscrições e informações financeiras, além de fornecer dashboards e relatórios para auxiliar na gestão da associação.

O sistema deverá possuir diferentes níveis de acesso, permitindo que cada usuário visualize e execute somente as funcionalidades compatíveis com sua função.

---

# 2. Problema

A Associação Cristã Pau-Brasil necessita de uma ferramenta centralizada para organizar suas atividades e informações.

O sistema deverá reduzir a dependência de controles manuais e informações dispersas, facilitando:

- cadastro e gerenciamento de pessoas;
- acompanhamento de membros;
- gerenciamento de voluntários;
- gerenciamento de beneficiários;
- organização de projetos;
- organização de eventos;
- controle de inscrições;
- gerenciamento financeiro;
- acompanhamento de recursos;
- geração de informações para gestão.

---

# 3. Objetivos

## 3.1 Objetivo geral

Desenvolver um sistema web capaz de centralizar e facilitar a gestão da Associação Cristã Pau-Brasil.

## 3.2 Objetivos específicos

O sistema deverá:

1. Centralizar os cadastros;
2. Gerenciar membros;
3. Gerenciar voluntários;
4. Gerenciar beneficiários;
5. Gerenciar projetos sociais;
6. Gerenciar eventos e programações;
7. Permitir inscrições em eventos;
8. Gerenciar receitas e despesas;
9. Relacionar despesas aos projetos;
10. Permitir armazenamento de comprovantes financeiros;
11. Gerenciar patrimônio;
12. Gerenciar estoque;
13. Gerenciar doações;
14. Disponibilizar dashboards;
15. Gerar relatórios;
16. Controlar permissões de acesso;
17. Registrar ações relevantes realizadas pelos usuários.

---

# 4. Conceitos fundamentais

O sistema deverá diferenciar os conceitos de:

- **Pessoa**
- **Membro**
- **Voluntário**
- **Beneficiário**
- **Usuário do sistema**

Uma mesma pessoa poderá possuir mais de um vínculo com a associação.

Exemplo:

> Uma pessoa pode ser membro da associação e também atuar como voluntária.
> 

Essa estrutura deverá ser validada durante a etapa de levantamento e modelagem dos requisitos.

---

# 5. Usuários e permissões

O sistema deverá possuir controle de acesso baseado em perfis.

## 5.1 Administrador

Acesso completo ao sistema.

Poderá:

- gerenciar usuários;
- gerenciar permissões;
- gerenciar pessoas;
- gerenciar membros;
- gerenciar voluntários;
- gerenciar beneficiários;
- gerenciar projetos;
- gerenciar eventos;
- gerenciar financeiro;
- gerenciar estoque;
- gerenciar patrimônio;
- visualizar auditoria;
- acessar configurações.

---

## 5.2 Financeiro

Acesso ao módulo financeiro.

Poderá:

- cadastrar receitas;
- cadastrar despesas;
- gerenciar categorias financeiras;
- visualizar dashboard financeiro;
- anexar comprovantes;
- gerar relatórios financeiros.

---

## 5.3 Coordenador

Poderá administrar:

- projetos;
- eventos;
- voluntários;
- participantes;
- beneficiários relacionados aos projetos sob sua responsabilidade.

---

## 5.4 Voluntário

Possuirá acesso limitado às funcionalidades necessárias para sua atuação.

---

## 5.5 Consulta

Possuirá acesso somente para visualização das informações autorizadas.

---

# 6. Autenticação

O sistema deverá possuir:

- tela de login;
- autenticação de usuários;
- encerramento de sessão;
- recuperação de senha;
- controle de acesso para usuários não autenticados.

---

# 7. Cadastro de usuários

Somente administradores poderão gerenciar usuários do sistema.

Cada usuário deverá possuir:

- nome;
- e-mail;
- credenciais de acesso;
- perfil;
- status.

O administrador poderá:

- criar;
- visualizar;
- editar;
- desativar usuários.

O sistema deverá preservar o histórico das ações realizadas por usuários desativados.

---

# 8. Cadastro de membros

O sistema deverá possuir uma área específica para gerenciamento dos membros da associação.

### Informações

- nome completo;
- foto;
- data de nascimento;
- CPF;
- telefone;
- WhatsApp;
- e-mail;
- endereço;
- data de entrada na associação;
- situação;
- observações;
- responsável, caso seja menor;
- área/projeto em que participa;
- data de cadastro.

### Situação

Inicialmente:

- Ativo;
- Inativo;
- Afastado.

---

# 9. Cadastro de voluntários

Uma pessoa poderá possuir vínculo de voluntariado sem necessariamente ser membro da associação.

O sistema deverá permitir registrar:

- área de atuação;
- disponibilidade;
- habilidades;
- dias disponíveis;
- projetos em que trabalha;
- histórico de voluntariado;
- horas trabalhadas.

### Exemplo

**Maria**

- Voluntária: Sim
- Área: Educação
- Disponibilidade: terça e quinta
- Habilidade: reforço escolar
- Projeto: Crianças e adolescentes

# 10. Cadastro de beneficiários

O sistema deverá permitir o cadastro de pessoas atendidas pela associação.

O beneficiário não precisará necessariamente ser membro da associação.

### Informações

- nome;
- faixa etária;
- projeto atendido;
- data de entrada;
- situação;
- histórico de atendimentos.

O acesso às informações dos beneficiários deverá ser controlado por permissões específicas.

---

# 11. Registro de atendimentos

O sistema deverá permitir registrar atendimentos realizados aos beneficiários.

Cada atendimento poderá possuir:

- beneficiário;
- data;
- tipo de atendimento;
- responsável;
- descrição;
- observações.

O sistema deverá manter um histórico de atendimentos por beneficiário.

---

# 12. Projetos sociais

O sistema deverá permitir o cadastro e gerenciamento dos projetos sociais da associação.

Cada projeto deverá possuir:

- nome;
- descrição;
- responsável;
- público atendido;
- local;
- horários;
- voluntários;
- participantes;
- recursos utilizados;
- despesas relacionadas;
- eventos relacionados;
- status.

Os projetos deverão permitir o relacionamento com outras áreas do sistema.

Exemplo:

```
Projeto
 ├── Beneficiários
 ├── Voluntários
 ├── Eventos
 └── Despesas
```

---

# 13. Agenda e eventos

O sistema deverá possuir um calendário central.

Deverá permitir visualizar eventos por:

- mês;
- semana;
- dia;
- lista.

Cada evento deverá possuir:

- nome;
- descrição;
- data;
- horário;
- local;
- responsável;
- categoria;
- público-alvo;
- quantidade máxima de participantes;
- necessidade de inscrição;
- status.

---

# 14. Inscrições em eventos

O sistema deverá permitir controlar inscrições em eventos.

Exemplo:

```
Acampamento Pau-Brasil

Data: 15/09/2026
Vagas: 50
Inscritos: 37
```

O responsável poderá visualizar:

- quantidade de inscritos;
- quantidade de vagas;
- lista de participantes;
- situação da inscrição.

---

# 15. Gestão financeira

O sistema deverá possuir um módulo financeiro.

## 15.1 Receitas

Categorias iniciais:

- Doações;
- Contribuições;
- Patrocínios;
- Convênios;
- Eventos;
- Outras receitas.

## 15.2 Despesas

Categorias iniciais:

- Aluguel;
- Energia;
- Água;
- Internet;
- Material de limpeza;
- Material de escritório;
- Alimentação;
- Transporte;
- Manutenção;
- Equipamentos;
- Projetos sociais;
- Contabilidade;
- Impostos/taxas;
- Outras despesas.

---

# 16. Movimentações financeiras

Cada movimentação deverá possuir:

- tipo;
- categoria;
- valor;
- data;
- descrição;
- forma de pagamento;
- responsável;
- projeto relacionado;
- anexo;
- status.

Exemplo:

```
Tipo: Despesa
Categoria: Energia
Valor: R$ 387,42
Data: 15/08/2026
Descrição: Conta de energia
Forma: PIX
Responsável: João
Anexo: conta_agosto.pdf
```

---

# 17. Dashboard financeiro

O sistema deverá apresentar informações consolidadas, como:

- receitas;
- despesas;
- saldo;
- receitas por categoria;
- despesas por categoria;
- evolução financeira por período;
- despesas por projeto.

Exemplo:

```
Receitas: R$ 8.420
Despesas: R$ 6.830
Saldo:    R$ 1.590
```

---

# 18. Anexos financeiros

O sistema deverá permitir anexar documentos às movimentações financeiras.

Exemplos:

- nota fiscal;
- recibo;
- comprovante PIX;
- boleto;
- contrato;
- conta de energia.

Os documentos deverão possuir controle de acesso adequado.

---

# 19. Patrimônio

O sistema deverá permitir cadastrar e acompanhar bens pertencentes à associação.

Exemplo:

```
Notebook Dell

Código: PAT-00023
Aquisição: 12/03/2025
Valor: R$ 3.200
Local: Sala administrativa
Responsável: João
Status: Em uso
```

### Informações

- nome;
- código;
- categoria;
- data de aquisição;
- valor;
- local;
- responsável;
- status;
- observações.

---

# 20. Estoque

O sistema deverá permitir controlar materiais e produtos utilizados pela associação.

Exemplos:

- alimentos;
- materiais de limpeza;
- materiais escolares;
- materiais de escritório.

Deverá permitir registrar:

### Entrada

Quantidade adicionada ao estoque.

### Saída

Quantidade retirada do estoque e sua destinação.

O sistema deverá manter histórico das movimentações.

# 21. Doações

O sistema deverá possuir cadastro de doações.

Cada doação poderá possuir:

- doador;
- valor;
- data;
- tipo;
- projeto destinado;
- forma de pagamento;
- comprovante;
- observações.

O sistema deverá permitir relacionar uma doação a um projeto específico.

---

# 22. Auditoria

O sistema deverá registrar ações relevantes realizadas pelos usuários.

Exemplo:

```
30/08/2026 19:43

Usuário: João

Ação: Alteração de despesa

Valor anterior: R$ 500
Novo valor:     R$ 650
```

A auditoria deverá ser utilizada principalmente para ações relacionadas a:

- usuários;
- permissões;
- financeiro;
- projetos;
- eventos;
- beneficiários;
- patrimônio;
- estoque.

Informações críticas deverão preferencialmente utilizar **inativação ou cancelamento**, evitando perda do histórico.

---

# 23. Relatórios

O sistema deverá permitir gerar relatórios.

## Financeiro

- receitas;
- despesas;
- saldo;
- categorias;
- período;
- projetos.

## Pessoas

- membros;
- voluntários;
- beneficiários.

## Projetos

- beneficiários;
- voluntários;
- custos;
- eventos relacionados.

## Eventos

- eventos;
- inscrições;
- participantes.

## Estoque

- entradas;
- saídas;
- saldo.

### Formatos

Os relatórios deverão permitir exportação para:

- PDF;
- Excel;
- CSV.

---

# 24. Dashboard geral

O sistema deverá possuir um dashboard administrativo com informações consolidadas.

Exemplo:

```
Membros       127
Voluntários    43
Beneficiários 218
Projetos        8
```

Também poderá apresentar:

- próximos eventos;
- situação financeira;
- projetos ativos;
- alertas importantes.

---

# 25. Requisitos não funcionais

## Segurança

O sistema deverá possuir autenticação e autorização adequadas.

## Privacidade

Dados pessoais deverão possuir proteção e controle de acesso compatíveis com sua natureza.

## Responsividade

O sistema deverá funcionar em:

- computadores;
- notebooks;
- tablets;
- smartphones.

## Backup

Deverá existir estratégia de backup dos dados.

## Auditoria

Operações críticas deverão possuir registro histórico.

## Escalabilidade

A arquitetura deverá permitir crescimento do número de usuários e dados.

---

# 26. Arquitetura tecnológica inicial

A arquitetura proposta para o projeto será:

```
                    INTERNET
                       │
                       ▼
               ┌───────────────┐
               │ React + TS    │
               │   Front-end   │
               └───────┬───────┘
                       │
                    HTTPS
                       │
                       ▼
               ┌───────────────┐
               │   FastAPI     │
               │    Python     │
               │   REST API    │
               └───────┬───────┘
                       │
                ┌──────┴──────┐
                ▼             ▼
         ┌────────────┐  ┌────────────┐
         │ PostgreSQL │  │  Storage   │
         │            │  │ Documentos │
         └────────────┘  └────────────┘
```

### Tecnologias

**Frontend**

- React
- TypeScript

**Backend**

- Python
- FastAPI

**Banco de dados**

- PostgreSQL

**ORM**

- SQLAlchemy

**Autenticação**

- JWT
- RBAC

**Infraestrutura**

- Docker

---

# 27. Escopo inicial do produto

O desenvolvimento inicial deverá contemplar:

### Autenticação e usuários

- Login;
- usuários;
- perfis;
- permissões.

### Pessoas

- membros;
- voluntários;
- beneficiários.

### Projetos

- cadastro;
- responsáveis;
- participantes;
- voluntários.

### Agenda

- calendário;
- eventos;
- inscrições.

### Financeiro

- categorias;
- receitas;
- despesas;
- anexos;
- dashboard financeiro.

### Dashboard

- indicadores gerais.

- 28. Funcionalidades futuras
    
    As funcionalidades abaixo **não fazem parte do escopo inicial** e deverão ser consideradas para versões futuras.
    
    ## Comunicação
    
    - mural interno;
    - integração com WhatsApp;
    - envio de e-mails;
    - notificações push.
    
    ## Eventos
    
    - formulário público de inscrição;
    - QR Code;
    - check-in;
    - controle de presença;
    - confirmação automática.
    
    ## Voluntariado
    
    - controle avançado de horas;
    - escalas;
    - relatórios de participação.
    
    ## Patrimônio
    
    - QR Code para identificação dos bens;
    - histórico avançado de manutenção;
    - controle de garantia.
    
    ## Estoque
    
    - alerta de estoque mínimo;
    - inventário;
    - relatórios avançados.
    
    ## Aplicações
    
    - aplicativo mobile;
    - portal público da associação.
    
    ## Integrações
    
    - WhatsApp;
    - serviços de e-mail;
    - outras plataformas externas.
    
    ---
    
    # 29. Fora do escopo inicial
    
    Para evitar aumento descontrolado do projeto, ficam fora do primeiro ciclo de desenvolvimento:
    
    - aplicativo mobile;
    - integrações com WhatsApp;
    - notificações push;
    - automações de comunicação;
    - QR Code;
    - check-in;
    - integrações externas;
    - funcionalidades avançadas de contabilidade;
    - funcionalidades que não tenham sido validadas com a associação.
    
    ---
    
    # 30. Critérios de sucesso
    
    O sistema será considerado funcional em sua primeira versão quando a associação conseguir:
    
    1. Acessar o sistema com segurança;
    2. Gerenciar seus usuários;
    3. Cadastrar membros;
    4. Cadastrar voluntários;
    5. Cadastrar beneficiários;
    6. Gerenciar projetos;
    7. Criar e visualizar eventos;
    8. Controlar inscrições;
    9. Registrar receitas;
    10. Registrar despesas;
    11. Anexar comprovantes;
    12. Visualizar informações financeiras;
    13. Controlar permissões;
    14. Consultar informações por meio dos dashboards;
    15. Gerar os relatórios previstos para a primeira versão.
    
    ---
    
    # 31. Status do PRD
    
    Este PRD representa a **versão inicial da visão do produto**, construída a partir das necessidades levantadas até o momento.
    
    Após o responsável pela Associação Cristã Pau-Brasil responder ao questionário, os requisitos deverão ser revisados e classificados como:
    
    - **Confirmados**
    - **A esclarecer**
    - **Alterados**
    - **Descartados**
    - **Novos requisitos**