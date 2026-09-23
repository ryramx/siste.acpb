# Deploy e operação — ACPB

Documento de decisão para a tarefa 38. Objetivo: alguém além do autor original conseguir reproduzir
o deploy e operar o sistema em produção.

## Arquitetura de produção

O sistema é dividido em quatro serviços, em três plataformas com plano gratuito permanente:

| Peça | Plataforma | Por quê |
|---|---|---|
| Frontend (`dist/`) | Render (site estático) | Mesmo blueprint da API; 100 GB/mês de banda |
| API (FastAPI) | Render (plano free) | Hiberna após ~15 min sem uso |
| Postgres | Neon | O Postgres gratuito do Render **expira**; o do Neon não |
| Anexos e fotos | Supabase Storage | O disco do Render é efêmero — ver "Armazenamento" |
| E-mail | Brevo (API HTTPS) | 300 mensagens/dia; HTTPS porque o Render bloqueia SMTP no plano gratuito |

Os dois serviços do Render são criados juntos pelo `render.yaml` da raiz.

**Consequência aceita conscientemente:** no plano gratuito do Render a API hiberna. A primeira
pessoa a acessar depois de um período ocioso espera cerca de 50 segundos. O site estático não
hiberna — a espera é da primeira chamada à API, com a tela já carregada. Se isso deixar de ser
aceitável, a migração natural é para o Google Cloud Run (mesma aplicação, sem cold start relevante).

## Armazenamento de arquivos

`STORAGE_BACKEND` escolhe onde ficam anexos financeiros e fotos de pessoas:

- `local` — disco. Usado em desenvolvimento e nos testes.
- `s3` — object storage S3-compatível (Supabase Storage). **Obrigatório em produção.**

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

**2. Arquivos (Supabase Storage)**
Crie um projeto, depois um bucket **privado** chamado `acpb-arquivos`, e em
Project Settings → Storage gere uma chave de acesso S3. Isso dá `S3_ENDPOINT_URL`
(`https://<ref-do-projeto>.supabase.co/storage/v1/s3`), `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` e `S3_REGION`.

O bucket precisa ser **privado**: os arquivos são servidos pela API, que verifica permissão a
cada download — um bucket público entregaria comprovantes financeiros a quem tivesse a URL.

`S3_REGION` aqui não é decorativa: o Supabase exige a região real do projeto na assinatura da
requisição (diferente do R2, que ignora e aceita `auto`). Ela aparece no painel do projeto.

**Por que Supabase e não Cloudflare R2:** o R2 tem franquia maior (10 GB contra 1 GB), mas exige
cadastrar cartão de crédito mesmo no plano gratuito. A camada de storage é S3-compatível genérica
(`app/core/object_storage.py`), então trocar de provedor é mudar variáveis de ambiente, não código.

**Ressalva do plano gratuito do Supabase:** projetos sem atividade por cerca de uma semana são
pausados, e um projeto pausado não responde — fotos e anexos passariam a dar 404 até alguém
reativar pelo painel. Se o sistema ficar longos períodos sem uso, vale incluir o Supabase no
mesmo uptime check que mantém a API acordada.

**3. E-mail (Brevo)**
Crie uma conta gratuita na Brevo (300 mensagens/dia, sem cartão). Em **SMTP & API → API
Keys**, gere uma chave: ela vira `BREVO_API_KEY`. Em **Senders**, cadastre o endereço
remetente e confirme com o código que chega nele — esse endereço vira `EMAIL_FROM`. Não é
preciso ter domínio próprio; um endereço comum serve. Contas novas passam por uma aprovação
manual da Brevo antes do primeiro envio.

**Por que não SMTP (nem o do Gmail):** o Render **bloqueia as portas 25, 465 e 587 nos
serviços do plano gratuito** desde setembro de 2025, para conter spam. Lá, qualquer SMTP
falha por timeout por mais correta que esteja a configuração — e foi o que aconteceu: o
sistema respondia "instruções enviadas" e nenhum e-mail saía, sem erro visível na tela. Uma
API sobre HTTPS atravessa o bloqueio.

A decisão anterior era o oposto (SMTP do Gmail, para alinhar SPF/DKIM de um remetente
`@gmail.com` e não cair em spam). Esse raciocínio continua válido em si, mas perdeu para uma
restrição mais dura: um e-mail que não sai não tem entregabilidade nenhuma. Se a associação
migrar para um plano pago do Render, `EMAIL_BACKEND=smtp` volta a ser possível sem mudar
código. Com domínio próprio, vale verificá-lo na Brevo (DKIM) para melhorar a entrega.

**Se o e-mail parar de funcionar:** um administrador consegue definir senha provisória para
qualquer usuário em **Configurações → Usuários → Redefinir senha**, sem depender de envio.
A ação fica registrada na auditoria.

Quando a associação tiver domínio, reavaliar: com domínio próprio um relay dedicado passa
a ser a opção melhor (limites maiores e métricas de entrega), e aí o remetente vira
`sistema@acpb.org.br`.

**4. API (Render)**
Aponte o Render para este repositório; ele lê o `render.yaml` da raiz e pede os valores marcados
como `sync: false` — são exatamente os dos passos 1 a 3. `JWT_SECRET_KEY` é gerada pelo próprio
Render, não precisa inventar.
Anote a URL pública do serviço (ex.: `https://acpb-api.onrender.com`).

**5. Frontend (site estático no Render)**
Vem no mesmo blueprint do passo 4 (serviço `acpb-sistema`), então já foi criado junto. O único
valor que ele pede é `VITE_API_URL` = a URL do passo 4.

O build **falha de propósito** se `VITE_API_URL` não estiver definida (ver `vite.config.ts`):
sem ela, o bundle apontaria para `127.0.0.1` e o sistema não carregaria para ninguém.
Anote a URL do site (ex.: `https://acpb-sistema.onrender.com`).

O blueprint declara um rewrite de `/*` para `/index.html`: o roteamento é do react-router, no
navegador, então sem isso abrir ou recarregar `/membros` direto daria 404 — só a raiz funcionaria.

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
| `S3_ENDPOINT_URL` | Sim | `https://<ref>.supabase.co/storage/v1/s3` |
| `S3_BUCKET` | Sim | Nome do bucket (`acpb-arquivos`) |
| `S3_ACCESS_KEY_ID` | Sim | Chave S3 do Supabase |
| `S3_SECRET_ACCESS_KEY` | Sim | Chave S3 do Supabase |
| `S3_REGION` | Sim | Região real do projeto Supabase — o padrão `auto` só serve ao R2 |
| `EMAIL_BACKEND` | Sim | `brevo` em produção (`smtp` só fora do plano gratuito do Render) |
| `BREVO_API_KEY` | Sim | Chave gerada em Brevo → SMTP & API → API Keys |
| `EMAIL_FROM` | Sim | Remetente verificado na Brevo |
| `EMAIL_FROM_NOME` | Não | `Sistema ACPB` (padrão) |
| `SMTP_*` | Não | Só com `EMAIL_BACKEND=smtp` (desenvolvimento ou servidor próprio) |
| `JWT_EXPIRE_MINUTES`, `RESET_PASSWORD_TOKEN_EXPIRE_MINUTES` | Não | Padrões razoáveis; revisar por ambiente |

A aplicação **recusa subir** em `ENVIRONMENT=production` se faltar qualquer obrigatória, se
`BACKEND_CORS_ORIGINS` contiver `*`, se `STORAGE_BACKEND` for `local`, ou se não houver SMTP —
é melhor falhar no deploy que descobrir o problema com o sistema no ar.

### Frontend (site estático no Render)

| Variável | Obrigatória | Valor |
|---|---|---|
| `VITE_API_URL` | Sim | URL pública da API |
| `NODE_VERSION` | Não | `22` (fixado no blueprint) |

## Desenvolvimento local

O projeto usa **portas fixas e proprias**, diferentes dos padroes, para conviver com outros
projetos rodando na mesma maquina:

| Peca | Porta | Padrao que seria usado |
|---|---|---|
| API (uvicorn) | **8001** | 8000 |
| Frontend (Vite) | **5174** | 5173 |

Sem isso, dois backends na mesma porta fazem o frontend conversar com o projeto errado — e o
sintoma e confuso, porque as rotas simplesmente nao existem do outro lado e tudo vira 404.

**Subir a API:**
```bash
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8001
```
Use `python -m uvicorn` e nao o `uvicorn.exe` do venv: o executavel tem o caminho de criacao do
venv embutido e quebra se a pasta do projeto for movida.

**Subir o frontend:**
```bash
npm run dev
```
A porta 5174 esta fixada em `vite.config.ts` com `strictPort`. Se ela estiver ocupada, o Vite
falha em vez de escolher outra em silencio — uma porta diferente mudaria a origem e o backend
recusaria as chamadas por CORS, com um erro que nao explica a causa.

O frontend encontra a API sozinho: sem `VITE_API_URL`, ele usa `http://127.0.0.1:8001` em
desenvolvimento. Em producao essa variavel e obrigatoria e o build falha sem ela.

**Antes de subir para producao:** rode a suite dos dois lados e confira no navegador.
```bash
cd backend && ./venv/Scripts/python.exe -m pytest -q
npm test && npx tsc --noEmit
```

Um push na branch `main` dispara deploy automatico no Render. Para trabalhar sem publicar,
use uma branch e so faca merge quando tiver validado localmente.

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
A execução está em `scripts/backup.sh`: gera um `pg_dump` e envia para o bucket, com expiração
automática por idade.

O plano gratuito do Neon **não** oferece restauração de longo prazo — sem esse script, um erro
humano (um `DELETE` sem `WHERE`, uma migration destrutiva) é definitivo. Agende-o em qualquer
executor de cron externo com as variáveis documentadas no cabeçalho do script.

Os arquivos em si (anexos e fotos) ficam no object storage, que é durável e não some em redeploy —
mas nenhum provedor protege contra remoção acidental, então o bucket não substitui backup.

Atenção ao compartilhamento de cota: no Supabase, backups do banco e arquivos do sistema disputam
o mesmo 1 GB. Se o volume apertar, mande os dumps para outro destino antes de reduzir retenção.

## Monitoramento mínimo

- Disponibilidade: verificação periódica de `/health/` e `/health/db` (uptime check externo).
- Erros: taxa de respostas 5xx da API — um aumento súbito indica problema de código ou de banco.
- Banco: consumo em relação ao limite do plano gratuito do Neon (0,5 GB). As tabelas
  `movimentacoes_financeiras` e `auditoria` crescem continuamente — a de auditoria é a que mais
  cresce, e é a primeira candidata a uma política de expurgo quando o limite se aproximar.
- Armazenamento no Supabase: consumo em relação ao 1 GB gratuito, disputado entre anexos, fotos e
  dumps de backup. Não há limpeza automática de anexos antigos.
- Uptime check externo: além de detectar queda, mantém a API acordada e reduz o cold start.
- Alertas de falha de backup (ver `BACKUP_E_RESTAURACAO.md`).
