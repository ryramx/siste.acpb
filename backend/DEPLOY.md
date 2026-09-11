# Deploy e operação — ACPB

Documento de decisão para a tarefa 38. Objetivo: alguém além do autor original conseguir reproduzir
o deploy e operar o sistema em produção.

## Build

**Backend** (Python/FastAPI):
```bash
python -m venv venv
source venv/bin/activate   # ou venv\Scripts\activate no Windows
pip install -r requirements.txt
```
Não há passo de "build" além de instalar dependências — é um projeto Python interpretado.

**Frontend** (React/Vite):
```bash
npm install
npm run build   # gera dist/ com os arquivos estáticos
```
`dist/` deve ser servido por um servidor de arquivos estáticos ou CDN; não depende de Node em
produção.

## Migrations no deploy

**Sempre rodar as migrations antes de subir a nova versão da aplicação**, nunca depois:
```bash
alembic upgrade head
```
- Se o deploy for para um ambiente com dados existentes (não um banco limpo), fazer backup antes
  (ver `BACKUP_E_RESTAURACAO.md`) — uma migration mal escrita pode ser destrutiva.
- Se uma migration precisar de uma janela de manutenção (ex.: altera uma coluna grande), avisar os
  usuários com antecedência; a maioria das migrations deste projeto são aditivas (criar tabela/coluna)
  e não exigem downtime.
- Nunca gerar uma migration em produção com `--autogenerate` sem revisar o arquivo antes de aplicar.

## Variáveis de ambiente obrigatórias

Ver a tabela completa em `CORS_E_PRODUCAO.md`. Resumo mínimo para o deploy funcionar:
`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`,
`JWT_SECRET_KEY`, `BACKEND_CORS_ORIGINS`, `ENVIRONMENT=production`.

## Subindo a aplicação

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```
Em produção, rodar atrás de um proxy reverso (nginx/Caddy) que termina TLS e encaminha para o
Uvicorn. Ajustar `--workers` conforme os núcleos de CPU disponíveis.

## Health check

- `GET /health/` — verifica se a API está de pé (não depende do banco).
- `GET /health/db` — verifica se a conexão com o PostgreSQL está funcionando.
- Configurar o orquestrador/load balancer para usar `/health/` como liveness probe e `/health/db`
  como readiness probe (só direcionar tráfego real quando o banco responder).

## Logs

- A aplicação usa o `logging` padrão do Python (ver `app/api/routes/auth.py` para um exemplo). Em
  produção, configurar o nível (`INFO` como padrão, `WARNING` para bibliotecas ruidosas) e
  redirecionar a saída para o coletor de logs da infraestrutura (arquivo rotacionado, ou stdout se
  o orquestrador capturar container logs).
- Nunca logar segredos — ver a seção "Logs" em `CORS_E_PRODUCAO.md`.

## Rollback

- **Código**: manter o deploy anterior disponível (ex.: imagem Docker com tag da versão anterior, ou
  branch/tag no controle de versão) para reverter rapidamente trocando o processo em execução.
- **Banco**: a maioria das migrations deste projeto são aditivas e não precisam de rollback de
  schema para reverter o código (uma coluna nova não usada pela versão antiga não quebra nada). Se
  uma migration específica remover ou alterar uma coluna existente, ela deve ter um `downgrade()`
  testado (ver o padrão em `alembic/versions/` — a migration baseline tem `upgrade`/`downgrade`
  validados de ponta a ponta como referência) antes de ir para produção.
- Se o rollback de código precisar reverter uma migration, rodar `alembic downgrade <revisao anterior>`
  **antes** de voltar a versão antiga da aplicação, nunca depois.

## Backup

Ver `BACKUP_E_RESTAURACAO.md` — backup diário/semanal/mensal do banco, backup dos anexos
financeiros em `storage/`, teste de restauração trimestral.

## Monitoramento mínimo

- Disponibilidade: verificação periódica de `/health/` e `/health/db` (uptime check externo).
- Erros: taxa de respostas 5xx da API — um aumento súbito indica problema de código ou de banco.
- Banco: espaço em disco (o volume de `movimentacoes_financeiras`, `auditoria` e `anexos_financeiros`
  cresce continuamente) e conexões ativas.
- Armazenamento de anexos (`backend/storage/anexos_financeiros/`): espaço em disco disponível —
  não há limpeza automática de anexos antigos.
- Alertas de falha de backup (ver `BACKUP_E_RESTAURACAO.md`).
