# Documentação — Sistema de Gestão ACPB

Ponto de entrada da documentação. A visão geral do sistema está no
[`README.md` da raiz](../README.md).

## Por onde começar

| Se você quer… | Vá para |
| ------------- | ------- |
| Entender o que o sistema faz e como rodar | [`README.md` da raiz](../README.md) |
| Subir a API localmente | [`backend/README.md`](../backend/README.md) |
| Entender uma regra de negócio ou de tela | [`produto/prd.md`](produto/prd.md) |
| Mexer no banco | [`backend/RELACIONAMENTOS.md`](../backend/RELACIONAMENTOS.md) |
| Publicar ou diagnosticar produção | [`backend/DEPLOY.md`](../backend/DEPLOY.md) |
| Saber por que algo foi feito assim | [`historico/`](historico/) |

## 📐 Produto

O que o sistema deve ser, decidido antes do código. São documentos de origem:
descrevem a intenção, não necessariamente o estado atual da implementação — para
isso, a tabela de módulos no [`README.md` da raiz](../README.md).

| Documento | Conteúdo |
| --------- | -------- |
| [`produto/prd.md`](produto/prd.md) | Requisitos do produto: escopo, módulos, perfis de acesso |
| [`produto/descricao-da-ui.md`](produto/descricao-da-ui.md) | Identidade visual, paleta, componentes e padrões de tela |
| [`produto/questionario-der.md`](produto/questionario-der.md) | Levantamento que originou a modelagem do banco |
| [`produto/diagrama-der.png`](produto/diagrama-der.png) | Diagrama entidade-relacionamento do banco |

## 🔧 Técnica (back-end)

Estes ficam em [`backend/`](../backend/), ao lado do código que os cita — há
dezenas de comentários no código apontando para eles, do tipo *"ver
RELACIONAMENTOS.md antes de alterar este relacionamento"*. Movê-los para cá
deixaria essas referências apontando para o vazio.

| Documento | Conteúdo |
| --------- | -------- |
| [`backend/README.md`](../backend/README.md) | Instalação, execução, migrations e testes |
| [`backend/RELACIONAMENTOS.md`](../backend/RELACIONAMENTOS.md) | Tabelas, chaves estrangeiras e regras de exclusão |
| [`backend/AUTENTICACAO.md`](../backend/AUTENTICACAO.md) | Autenticação, tokens e recuperação de senha |
| [`backend/RBAC.md`](../backend/RBAC.md) | Matriz de perfis × permissões |
| [`backend/CORS_E_PRODUCAO.md`](../backend/CORS_E_PRODUCAO.md) | CORS e validações obrigatórias em produção |
| [`backend/DEPLOY.md`](../backend/DEPLOY.md) | Deploy no Render, portas locais, health checks e rollback |
| [`backend/BACKUP_E_RESTAURACAO.md`](../backend/BACKUP_E_RESTAURACAO.md) | Backup, retenção e teste de restauração |
| [`backend/PRIVACIDADE_E_RETENCAO.md`](../backend/PRIVACIDADE_E_RETENCAO.md) | Dados pessoais e política de retenção |

## 📜 Histórico

Por que o sistema é como é. Consultado quando uma decisão parece estranha e
vale saber o que a motivou.

| Documento | Conteúdo |
| --------- | -------- |
| [`historico/progresso-das-tarefas.md`](historico/progresso-das-tarefas.md) | As 42 tarefas do plano original, o que cada uma entregou e os achados pelo caminho |
| [`historico/auditoria-das-sessoes-de-ia.md`](historico/auditoria-das-sessoes-de-ia.md) | Resumo executivo: escopo, bugs reais encontrados, decisões de segurança |

> Os 37 arquivos de tarefa já concluídas foram removidos do repositório — o que
> cada uma entregou está registrado em `progresso-das-tarefas.md`, e os arquivos
> em si continuam no histórico do git.

## 🔮 Futuro

Previsto, especificado, **não implementado**. Continua aqui porque é a
especificação pronta de quando a associação precisar.

| Documento | Situação |
| --------- | -------- |
| [`futuro/estoque.md`](futuro/estoque.md) | Não modelado |
| [`futuro/doacoes.md`](futuro/doacoes.md) | Não modelado |
| [`futuro/comunicacao-interna.md`](futuro/comunicacao-interna.md) | Fora do 1º ciclo |
| [`futuro/recursos-avancados-de-eventos.md`](futuro/recursos-avancados-de-eventos.md) | Fora do 1º ciclo |
| [`futuro/recursos-avancados-operacionais.md`](futuro/recursos-avancados-operacionais.md) | Fora do 1º ciclo |
