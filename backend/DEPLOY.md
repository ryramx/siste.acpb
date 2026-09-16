# Deploy e operação — ACPB

Documento de decisão para a tarefa 38. Objetivo: alguém além do autor original conseguir reproduzir
o deploy e operar o sistema em produção.

## Arquitetura de produção

O sistema é dividido em quatro serviços, cada um numa plataforma com plano gratuito permanente:

| Peça | Plataforma | Por quê |
|---|---|---|
| Frontend (`dist/`) | Cloudflare Pages | Estático; banda ilimitada no plano gratuito |
| API (FastAPI) | Render (plano free) | Hiberna após ~15 min sem uso |
| Postgres | Neon | O Postgres gratuito do Render **expira**; o do Neon não |
| Anexos e fotos | Cloudflare R2 | O disco do Render é efêmero — ver "Armazenamento" |
| E-mail | Brevo (SMTP) | 300 mensagens/dia, sem cartão |

**Consequência aceita conscientemente:** no plano gratuito do Render a API hiberna. A primeira
pessoa a acessar depois de um período ocioso espera cerca de 50 segundos. Se isso deixar de ser
aceitável, a migração natural é para o Google Cloud Run (mesma aplicação, sem cold start relevante).

## Armazenamento de arquivos

`STORAGE_BACKEND` escolhe onde ficam anexos financeiros e fotos de pessoas:

- `local` — disco. Usado em desenvolvimento e nos testes.
- `s3` — object storage S3-compatível (Cloudflare R2). **Obrigatório em produção.**

O disco de plataformas de PaaS em plano gratuito é efêmero: todo redeploy o zera. Como anexos
financeiros são comprovantes de prestação de contas, perdê-los silenciosamente é inaceitável —
por isso a aplicação **recusa subir** com `ENVIRONMENT=production` e `STORAGE_BACKEND=local`
(ver `app/core/config.py::_validar_configuracao_producao`).

A troca de provedor é transparente para as rotas: elas só conhecem `salvar`/`ler`/`remover` de
`app/core/object_storage.py`.

## Passo a passo do primeiro deploy

Faça nesta ordem — cada passo produz um valor que o seguinte consome.

**1. Banco (Neon)**
Crie um projeto e copie a connection string (algo como
`postgresql://usuario:senha@ep-xxxx.neon.tech/acpb?sslmode=require`). Ela vira `DATABASE_URL`.
Use a string inteira, não os campos separados: ela já traz o `sslmode=require` que o Neon exige e
que se perderia ao remontar a URI por partes.

**2. Arquivos (Cloudflare R2)**
Crie um bucket (ex.: `acpb-arquivos`) e um API token com permissão de leitura e escrita nele.
Isso dá `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`.
O bucket deve ser **privado**: os arquivos são servidos pela API, que verifica permissão a cada
download — um bucket público entregaria comprovantes financeiros a quem tivesse a URL.

**3. E-mail (Brevo)**
Crie uma conta, verifique o domínio ou o remetente, e gere uma chave de SMTP.
Isso dá `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`.

**4. API (Render)**
Aponte o Render para este repositório; ele lê o `render.yaml` da raiz e pede os valores marcados
como `sync: false` — são exatamente os dos passos 1 a 3. `JWT_SECRET_KEY` é gerada pelo próprio
Render, não precisa inventar.
Anote a URL pública do serviço (ex.: `https://acpb-api.onrender.com`).

**5. Frontend (Cloudflare Pages)**
Aponte para o mesmo repositório, com:
- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Variável de ambiente: `VITE_API_URL` = a URL do passo 4

O build **falha de propósito** se `VITE_API_URL` não estiver definida (ver `vite.config.ts`):
sem ela, o bundle apontaria para `127.0.0.1` e o sistema não carregaria para ninguém.
Anote a URL do site (ex.: `https://acpb.pages.dev`).

**6. Fechar o círculo**
Volte ao Render e preencha, agora que a URL do passo 5 existe:
- `BACKEND_CORS_ORIGINS` = a URL do frontend (sem `/` no final, sem `*`)
- `FRONTEND_URL` = a mesma URL (usada no link do e-mail de redefinição de senha)

**7. Primeiro acesso**
As migrations rodam sozinhas na subida (`startCommand` do `render.yaml`). Confirme
`GET /health/db` respondendo.

Num banco novo ainda **não existe nenhum usuário**: as migrations semeiam perfis e
permissões, mas todas as rotas que criam usuário exigem estar autenticado e com
permissão — ou seja, sem um primeiro administrador o sistema fica inacessível. Crie-o
pelo shell do Render (aba "Shell" do serviço):

```bash
ADMIN_EMAIL=admin@acpb.org.br ADMIN_SENHA='<senha forte>' ADMIN_NOME='Nome Completo' \
  python -m scripts.criar_admin
```

O script só cria o **primeiro** administrador: se já houver um ativo, ele se recusa a
rodar, para que reexecutá-lo não vire caminho de escalar privilégio ou trocar a senha de
um admin existente. Daí em diante, usuários são criados pela tela de administração.

Feito isso, faça o login com esse usuário e troque a senha.

## Variáveis de ambiente

### API (Render)

| Variável | Obrigatória | Valor |
|---|---|---|
| `ENVIRONMENT` | Sim | `production` |
| `DATABASE_URL` | Sim | Connection string do Neon (com `sslmode=require`) |
| `JWT_SECRET_KEY` | Sim | Gerada pelo Render; única por ambiente |
| `BACKEND_CORS_ORIGINS` | Sim | URL do frontend. Lista explícita, nunca `*` |
| `FRONTEND_URL` | Sim | URL do frontend (link do e-mail de senha) |
| `STORAGE_BACKEND` | Sim | `s3` |
| `S3_ENDPOINT_URL` | Sim | Endpoint S3 do R2 |
| `S3_BUCKET` | Sim | Nome do bucket |
| `S3_ACCESS_KEY_ID` | Sim | Token do R2 |
| `S3_SECRET_ACCESS_KEY` | Sim | Token do R2 |
| `S3_REGION` | Não | `auto` (padrão; o R2 ignora, mas o cliente exige um valor) |
| `SMTP_HOST` | Sim | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Não | `587` (padrão) |
| `SMTP_USER` / `SMTP_PASSWORD` | Sim | Credenciais do Brevo |
| `SMTP_FROM` | Sim | Remetente verificado |
| `SMTP_FROM_NOME` | Não | `Sistema ACPB` (padrão) |
| `JWT_EXPIRE_MINUTES`, `RESET_PASSWORD_TOKEN_EXPIRE_MINUTES` | Não | Padrões razoáveis; revisar por ambiente |

A aplicação **recusa subir** em `ENVIRONMENT=production` se faltar qualquer obrigatória, se
`BACKEND_CORS_ORIGINS` contiver `*`, se `STORAGE_BACKEND` for `local`, ou se não houver SMTP —
é melhor falhar no deploy que descobrir o problema com o sistema no ar.

### Frontend (Cloudflare Pages)

| Variável | Obrigatória | Valor |
|---|---|---|
| `VITE_API_URL` | Sim | URL pública da API |

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
VITE_API_URL=https://sua-api.onrender.com npm run build
```
`dist/` é servido por um servidor de arquivos estáticos ou CDN; não depende de Node em produção.

## Migrations no deploy

**Sempre rodar as migrations antes de subir a nova versão da aplicação**, nunca depois:
```bash
alembic upgrade head
```
No Render isso já está no `startCommand` do `render.yaml`. O comando é idempotente: num banco já
atualizado é um no-op rápido, o que importa porque o plano gratuito hiberna e reexecuta isso a
cada retorno.

- Se o deploy for para um ambiente com dados existentes (não um banco limpo), fazer backup antes
  (ver `BACKUP_E_RESTAURACAO.md`) — uma migration mal escrita pode ser destrutiva.
- Se uma migration precisar de uma janela de manutenção (ex.: altera uma coluna grande), avisar os
  usuários com antecedência; a maioria das migrations deste projeto são aditivas (criar tabela/coluna)
  e não exigem downtime.
- Nunca gerar uma migration em produção com `--autogenerate` sem revisar o arquivo antes de aplicar.

## Subindo a aplicação

No Render isso é automático: o `startCommand` do `render.yaml` aplica as migrations e sobe o
Uvicorn, e o TLS é terminado pela própria plataforma.

Em servidor próprio (ex.: se um dia migrar para uma VM), o equivalente é:
```bash
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```
atrás de um proxy reverso (nginx/Caddy) que termina TLS. Ajustar `--workers` conforme os núcleos
disponíveis — no plano gratuito do Render, com 512 MB, mantenha um worker só.

## Health check

- `GET /health/` — verifica se a API está de pé (não depende do banco).
- `GET /health/db` — verifica se a conexão com o PostgreSQL está funcionando.
- Configurar o orquestrador/load balancer para usar `/health/` como liveness probe e `/health/db`
  como readiness probe (só direcionar tráfego real quando o banco responder). No `render.yaml`,
  `healthCheckPath` aponta para `/health/`, de propósito: usar `/health/db` ali faria um Postgres
  momentaneamente indisponível derrubar o serviço inteiro.

## Logs

- A aplicação usa o `logging` padrão do Python (ver `app/api/routes/auth.py` para um exemplo). Em
  produção, configurar o nível (`INFO` como padrão, `WARNING` para bibliotecas ruidosas) e
  redirecionar a saída para o coletor de logs da infraestrutura (arquivo rotacionado, ou stdout se
  o orquestrador capturar container logs — é o caso do Render).
- Nunca logar segredos — ver a seção "Logs" em `CORS_E_PRODUCAO.md`.

## Rollback

- **Código**: manter o deploy anterior disponível (no Render, "Rollback" restaura o build anterior;
  em outras plataformas, a tag da versão anterior) para reverter rapidamente.
- **Banco**: a maioria das migrations deste projeto são aditivas e não precisam de rollback de
  schema para reverter o código (uma coluna nova não usada pela versão antiga não quebra nada). Se
  uma migration específica remover ou alterar uma coluna existente, ela deve ter um `downgrade()`
  testado (ver o padrão em `alembic/versions/` — a migration baseline tem `upgrade`/`downgrade`
  validados de ponta a ponta como referência) antes de ir para produção.
- Se o rollback de código precisar reverter uma migration, rodar `alembic downgrade <revisao anterior>`
  **antes** de voltar a versão antiga da aplicação, nunca depois.

## Backup

Ver `BACKUP_E_RESTAURACAO.md` para a política (retenção, teste de restauração trimestral).
A execução está em `scripts/backup.sh`: gera um `pg_dump` e envia para o R2, com expiração
automática por idade.

O plano gratuito do Neon **não** oferece restauração de longo prazo — sem esse script, um erro
humano (um `DELETE` sem `WHERE`, uma migration destrutiva) é definitivo. Agende-o em qualquer
executor de cron externo com as variáveis documentadas no cabeçalho do script.

Os arquivos em si (anexos e fotos) ficam no R2, que é durável e não some em redeploy; ainda assim
vale habilitar versionamento no bucket, porque o R2 não protege contra remoção acidental.

## Monitoramento mínimo

- Disponibilidade: verificação periódica de `/health/` e `/health/db` (uptime check externo).
- Erros: taxa de respostas 5xx da API — um aumento súbito indica problema de código ou de banco.
- Banco: consumo em relação ao limite do plano gratuito do Neon (0,5 GB). As tabelas
  `movimentacoes_financeiras` e `auditoria` crescem continuamente — a de auditoria é a que mais
  cresce, e é a primeira candidata a uma política de expurgo quando o limite se aproximar.
- Armazenamento no R2: consumo em relação aos 10 GB gratuitos. Não há limpeza automática de
  anexos antigos.
- Uptime check externo: além de detectar queda, mantém a API acordada e reduz o cold start.
- Alertas de falha de backup (ver `BACKUP_E_RESTAURACAO.md`).
