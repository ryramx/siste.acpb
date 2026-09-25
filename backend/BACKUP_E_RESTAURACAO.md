# Backup e restauração — PostgreSQL (ACPB)

Documento de decisão para a tarefa 36. Cobre o banco `acpb_db` (produção e desenvolvimento) e os
arquivos de anexos financeiros em `backend/storage/` (tarefa 20), que não estão no banco e por isso
precisam de backup próprio.

## Periodicidade e retenção

| Tipo | Frequência | Retenção |
|---|---|---|
| Backup completo do banco (`pg_dump`, formato custom `-F c`) | Diário, fora do horário de uso (madrugada) | 30 dias rolantes |
| Backup completo do banco | Semanal (aos domingos) | 6 meses |
| Backup completo do banco | Mensal (dia 1) | 24 meses (obrigação legal/contábil de guarda de registros financeiros) |
| Arquivos de anexos financeiros e fotos de pessoa (hoje no Supabase Storage, não em `backend/storage/`) | Espelho diário, junto com o backup do banco; pacote fechado no mensal | Espelho sem expiração; pacote mensal por 24 meses (ver "Estado da automação") |

Justificativa da retenção de 24 meses nos backups mensais: o sistema guarda movimentações
financeiras e comprovantes que a associação pode precisar apresentar em prestação de contas ou
auditoria externa muito depois do lançamento original.

## Criptografia

- Backup gerado com `pg_dump -F c` (formato binário comprimido, já reduz exposição de texto puro).
- Arquivo de backup é criptografado em repouso com `age` (ou `gpg -c`, cifra simétrica) antes de sair
  da máquina/servidor de origem — a senha/chave de criptografia é armazenada separadamente do
  destino do backup (nunca junto no mesmo local de armazenamento).
- Backups em trânsito (upload para armazenamento externo) usam conexão com TLS.

## Local de armazenamento

- Cópia local: no próprio servidor de banco, em disco separado do volume de dados (`/var/backups/acpb/`),
  apenas para restauração rápida de curto prazo (últimos 2-3 dias).
- Cópia externa (offsite): enviada diariamente para armazenamento fora do servidor de produção
  (ex.: bucket de object storage de outro provedor/região). **Nunca depender só do backup local** —
  se o servidor for perdido, o backup local vai junto.
- Regra 3-2-1 como referência: pelo menos 3 cópias, em 2 mídias/locais diferentes, sendo 1 fora do
  local de produção.

## Responsável

- Um responsável técnico nomeado (ex.: o desenvolvedor/administrador de infraestrutura da ACPB) é
  o dono do processo de backup: garante que os jobs rodam, que os alertas de falha chegam a alguém, e
  executa o teste de restauração periódico (ver abaixo).
- Em caso de ausência do responsável principal, um segundo contato deve saber onde estão os backups
  e como restaurá-los (documentado neste arquivo + credenciais em cofre de senhas da associação).

## Alerta de falha

- O job de backup (script/cron) registra sucesso/falha em log e **falha ruidosamente**: se o
  `pg_dump` retornar código de saída diferente de zero, ou se o arquivo gerado tiver tamanho zero ou
  muito menor que o backup anterior (heurística de "backup vazio"), o job deve notificar o
  responsável (e-mail ou mensagem instantânea) imediatamente — não é aceitável descobrir uma falha
  de backup só quando for tarde para restaurar.
- Um backup ausente por mais de 48h deve gerar alerta separado (job de monitoramento verificando a
  data de modificação do último arquivo de backup).

## Teste de restauração

- **Trimestral**, no mínimo: restaurar o backup mais recente em um banco separado (nunca sobrepor o
  banco de produção) e validar:
  1. `pg_restore` completa sem erros.
  2. Contagem de linhas das tabelas principais (`pessoas`, `usuarios`, `movimentacoes_financeiras`)
     é consistente com o esperado.
  3. A aplicação sobe apontando para o banco restaurado e os fluxos críticos (login, listar membros,
     listar movimentações) funcionam.
- Resultado do teste (sucesso/falha, data, quem executou) é registrado — um backup nunca testado é,
  na prática, um backup cuja integridade é desconhecida.

## Roteiro de restauração

É o passo a passo do teste trimestral acima, para os arquivos que `.github/workflows/backup.yml`
gera: prova que o arquivo abre com a senha do cofre, restaura sem erro num banco **separado** e sobe
a aplicação com os dados. Nada aqui toca produção: o Neon não é acessado, e do bucket só se
**baixa** arquivo. A mesma sequência, a partir do passo 1, serve para uma restauração de verdade;
só o destino muda, e trocar o banco de produção exige decisão explícita.

Tempo estimado: 30 a 60 minutos. Faça num computador confiável: o arquivo restaurado contém dados
pessoais reais (CPF inclusive).

### 0. O que você precisa

| Item | Onde está |
|---|---|
| A senha do backup (`BACKUP_PASSPHRASE`) | Cofre de senhas da associação. **Não** no GitHub: lá o segredo não pode ser lido de volta. |
| Acesso ao bucket do Supabase Storage | Painel do Supabase, ou as chaves `S3_*` do painel do Render > acpb-api > Environment |
| Docker | Para rodar o Postgres de teste na versão certa (ver passo 3) |
| `gpg` 2.x | Linux/macOS já têm ou instalam fácil; no Windows, Gpg4win ou WSL |
| O repositório clonado, com `backend/requirements.txt` instalado num venv | Para o passo 6 (subir a API) |

Regras que valem o roteiro inteiro:

- **Nunca** use a `DATABASE_URL` de produção em nenhum comando abaixo.
- **Nunca** digite a senha na linha de comando (`--passphrase "..."`): ela fica no histórico do shell
  e aparece na lista de processos. O roteiro lê a senha sem ecoar e passa por *pipe*.
- Não use "Esqueci minha senha" na aplicação restaurada: os e-mails no banco são de pessoas reais.

Prepare uma pasta de trabalho:

```bash
mkdir -p ~/teste-restauracao && cd ~/teste-restauracao
```

### 1. Baixar o arquivo mais recente

Os dumps ficam em `backups/diario/acpb-AAAA-MM-DD.dump.gpg` (30 dias), `backups/semanal/` (6 meses)
e `backups/mensal/` (24 meses, com o pacote de arquivos `acpb-arquivos-AAAA-MM-DD.tar.gz.gpg`).

**Opção A, pelo painel (mais simples):** Supabase > Storage > o bucket > `backups/diario/` > baixe
o arquivo com a data mais recente para `~/teste-restauracao`.

**Opção B, pela linha de comando** (com as chaves do Render exportadas na sessão; é só leitura):

```bash
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_DEFAULT_REGION=...
ENDPOINT=...   # S3_ENDPOINT_URL
BUCKET=...     # S3_BUCKET
aws s3 ls "s3://$BUCKET/backups/diario/" --endpoint-url "$ENDPOINT"
aws s3 cp "s3://$BUCKET/backups/diario/acpb-AAAA-MM-DD.dump.gpg" . --endpoint-url "$ENDPOINT"
```

Anote a data do arquivo. Confira que o tamanho bate com o que o log do workflow mostrou ("Tamanho do
dump") e que não é minúsculo.

### 2. Checar a senha do gpg (sem gravar nada)

Use uma pasta do gpg nova e vazia. Isso garante que nenhuma senha em cache de um teste anterior
"ajude" a checagem; o caminho curto evita um erro do gpg-agent com caminhos longos.

```bash
export GNUPGHOME=$(mktemp -d /tmp/gpgXXXX)
ARQ=acpb-AAAA-MM-DD.dump.gpg
```

**2a. Primeiro, prove que uma senha errada é recusada.** Isto confirma que o teste distingue certo de
errado:

```bash
printf 'senha-errada-de-proposito' | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
  --decrypt --output /dev/null "$ARQ"; echo "saida=$?"
```

Esperado: `gpg: decryption failed: Bad session key` e `saida=2`.

**2b. Agora a senha do cofre.** O `read -rs` lê sem mostrar na tela:

```bash
read -rs -p "Senha do backup: " SENHA; echo
printf '%s' "$SENHA" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
  --decrypt --output /dev/null "$ARQ"; echo "saida=$?"
```

Esperado:

```
gpg: AES256.CFB encrypted data
gpg: encrypted with 1 passphrase
saida=0
```

Como ler o resultado:

| O que aparece | Significado | O que fazer |
|---|---|---|
| `saida=0`, sem avisos | Senha certa e arquivo íntegro | Seguir |
| `Bad session key` | **A senha do cofre não é a que o GitHub usa.** Todo backup gerado até hoje está inacessível com ela | Parar. Descobrir a senha certa ou trocar o segredo no GitHub pela do cofre e rodar o workflow de novo. Registrar |
| `WARNING: message was not integrity protected` | O arquivo não tem verificação de integridade | Não confiar; registrar e investigar |
| `invalid packet`, `unexpected EOF` | Download incompleto ou arquivo corrompido | Baixar de novo; se persistir, testar o dump do dia anterior |

Repita o 2b também num arquivo de `backups/mensal/`, se já houver um: é o backup de longo prazo e usa
a mesma senha.

### 3. Descriptografar e conferir o conteúdo do dump

```bash
printf '%s' "$SENHA" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
  --decrypt --output acpb-restaurar.dump "$ARQ"
```

O dump foi gerado com `postgres:latest` (o Neon já estava no 18.6 na primeira execução), e o
`pg_restore` precisa ser da **mesma versão ou mais novo** que o `pg_dump` que gerou o arquivo. Um
`pg_restore` 16 ou 17 instalado na máquina recusa o arquivo com `unsupported version in file
header`. Por isso tudo roda dentro da imagem oficial, igual ao workflow:

```bash
docker run --rm -v "$PWD":/w postgres:latest pg_restore --list /w/acpb-restaurar.dump | head -15
```

Confira no cabeçalho: `Format: CUSTOM`, `Dumped from database version: 18.x`, e a data em
`Archive created at` igual à do nome do arquivo. Depois conte as tabelas com dados:

```bash
docker run --rm -v "$PWD":/w postgres:latest pg_restore --list /w/acpb-restaurar.dump | grep -c "TABLE DATA"
```

Esperado: **25** (as 24 tabelas do sistema mais `alembic_version`, no schema atual).

### 4. Subir um Postgres de teste e restaurar

Um banco vazio, só na sua máquina, na porta 5499 para não colidir com nenhum Postgres local:

```bash
docker run -d --name acpb-restauracao -e POSTGRES_PASSWORD=teste -p 127.0.0.1:5499:5432 \
  -v "$PWD":/w postgres:latest
sleep 5
docker exec acpb-restauracao createdb -U postgres acpb_teste_restauracao
```

Restaure. `--exit-on-error` faz o primeiro erro parar tudo, em vez de passar batido no meio de um
log longo; `--no-owner --no-privileges` porque os papéis do Neon não existem aqui (o dump já sai
assim, é só reforço):

```bash
docker exec acpb-restauracao pg_restore -U postgres -d acpb_teste_restauracao \
  --no-owner --no-privileges --exit-on-error /w/acpb-restaurar.dump; echo "saida=$?"
```

Esperado: nenhuma mensagem e `saida=0`.

Se parar num objeto que é do Neon e não do sistema (uma extensão, um papel), gere uma lista sem ele e
restaure de novo num banco recriado:

```bash
docker exec acpb-restauracao sh -c 'pg_restore --list /w/acpb-restaurar.dump > /w/lista.txt'
# edite lista.txt e comente com ';' só a linha do objeto do Neon que falhou
docker exec acpb-restauracao dropdb -U postgres acpb_teste_restauracao
docker exec acpb-restauracao createdb -U postgres acpb_teste_restauracao
docker exec acpb-restauracao pg_restore -U postgres -d acpb_teste_restauracao \
  --no-owner --no-privileges --exit-on-error -L /w/lista.txt /w/acpb-restaurar.dump
```

Anote no registro qualquer linha que precisou ser comentada: é algo que a restauração de verdade vai
precisar também.

### 5. Conferir os dados restaurados

```bash
docker exec -i acpb-restauracao psql -U postgres -d acpb_teste_restauracao <<'SQL'
select 'versao do schema' as item, version_num as valor from alembic_version
union all select 'pessoas',              count(*)::text from pessoas
union all select 'usuarios',             count(*)::text from usuarios
union all select 'membros',              count(*)::text from membros
union all select 'movimentacoes',        count(*)::text from movimentacoes_financeiras
union all select 'anexos financeiros',   count(*)::text from anexos_financeiros
union all select 'permissoes',           count(*)::text from permissoes
union all select 'mov. mais recente',    max(created_at)::text from movimentacoes_financeiras
union all select 'auditoria mais recente', max(created_at)::text from auditoria;
SQL
```

O que conferir:

- **Versão do schema** igual à última migration do repositório na data do backup. Hoje é
  `a83f14d7e2b6`; para saber a atual: `cd backend && alembic heads`.
- **Contagens** coerentes com o que a tela do sistema mostra (Pessoas, Membros, Movimentações). Não é
  preciso consultar produção: basta comparar com as telas, sabendo que o que foi lançado depois das
  03:00 do dia do backup não estará lá.
- **Datas mais recentes** na véspera ou na madrugada do dia do backup. Datas muito antigas indicam
  que o backup está congelado num estado velho.
- **permissoes = 32** (as sementes das migrations; um número diferente indica schema incompleto).

### 6. Subir a aplicação apontando para o banco restaurado

É o teste que a política pede: o sistema abre, faz login e lista. No terminal, dentro de `backend/`
com o venv ativo:

```bash
export ENVIRONMENT=development
export DATABASE_URL=postgresql://postgres:teste@127.0.0.1:5499/acpb_teste_restauracao
export JWT_SECRET_KEY=teste-restauracao-local
export STORAGE_BACKEND=local
# Sem SMTP_HOST nem BREVO_API_KEY: a cópia local não tem como mandar e-mail a ninguém.
uvicorn app.main:app --port 8000
```

Em outro terminal:

```bash
curl -s localhost:8000/health/db
```

Esperado: `{"status":"ok","message":"Conexão com PostgreSQL bem sucedida"}`.

Depois suba o frontend na raiz do repositório com `VITE_API_URL=http://localhost:8000 npm run dev`
(ele abre em `http://localhost:5173`, que é a origem que a API já aceita por padrão) e,
**com o seu próprio login de produção** (as senhas vêm junto no backup):

1. Entrar no sistema.
2. Abrir Pessoas e Membros: a lista aparece com os nomes esperados.
3. Abrir Movimentações: os lançamentos recentes estão lá.

Sem frontend, o mesmo pela API:

```bash
read -rs -p "Sua senha: " SUA_SENHA; echo
TOKEN=$(curl -s -X POST localhost:8000/auth/login -H 'content-type: application/json' \
  -d "{\"email\":\"seu@email\",\"senha\":\"$SUA_SENHA\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s -o /dev/null -w "pessoas: %{http_code}\n" localhost:8000/pessoas/ -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "movimentacoes: %{http_code}\n" localhost:8000/movimentacoes-financeiras/ -H "Authorization: Bearer $TOKEN"
unset SUA_SENHA
```

Esperado: `200` nas duas.

### 7. Arquivos (comprovantes e fotos), quando houver pacote mensal

O `pg_dump` não leva os arquivos; eles estão no pacote mensal. Baixe
`backups/mensal/acpb-arquivos-AAAA-MM-DD.tar.gz.gpg` e:

```bash
printf '%s' "$SENHA" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
  --decrypt --output arquivos.tar.gz acpb-arquivos-AAAA-MM-DD.tar.gz.gpg
tar -xzf arquivos.tar.gz            # cria arquivos/anexos_financeiros/ e arquivos/fotos_pessoas/
find arquivos -type f | wc -l       # compare com "Arquivos empacotados" no log do workflow
```

Confira que os comprovantes do banco estão no pacote. Os que faltarem devem ser só os enviados depois
do dia 1:

```bash
docker exec acpb-restauracao psql -U postgres -d acpb_teste_restauracao -Atc \
  "select nome_armazenado from anexos_financeiros" | sort > no_banco.txt
ls arquivos/anexos_financeiros | sort > no_pacote.txt
comm -23 no_banco.txt no_pacote.txt   # comprovantes no banco que não estão no pacote
```

Para ver um comprovante abrir pela tela, suba a API do passo 6 com, além das variáveis de lá:

```bash
export ANEXOS_STORAGE_DIR=~/teste-restauracao/arquivos/anexos_financeiros
export FOTOS_STORAGE_DIR=~/teste-restauracao/arquivos/fotos_pessoas
```

e abra uma movimentação com comprovante.

### 8. Limpar

```bash
docker rm -f acpb-restauracao
shred -u acpb-restaurar.dump arquivos.tar.gz 2>/dev/null; rm -f acpb-restaurar.dump arquivos.tar.gz
rm -rf arquivos no_banco.txt no_pacote.txt lista.txt "$GNUPGHOME"
unset SENHA GNUPGHOME
```

Os `.gpg` baixados podem ficar (estão cifrados) ou ser apagados; o original continua no bucket.

### 9. Registrar o resultado

A política pede o registro (data, quem executou, sucesso ou falha). Modelo:

```
Teste de restauração — AAAA-MM-DD
Executado por: 
Arquivo testado: backups/diario/acpb-AAAA-MM-DD.dump.gpg (tamanho: )
Senha do cofre abriu o arquivo: sim / não
pg_restore sem erros: sim / não (linhas comentadas na lista: )
Versão do schema: 
Contagens: pessoas= usuarios= membros= movimentacoes= anexos=
Login + listas na aplicação: ok / falhou
Pacote mensal de arquivos testado: sim (AAAA-MM-DD, N arquivos, faltando: ) / ainda não existe
Próximo teste (trimestral): AAAA-MM-DD
```

### O que já foi ensaiado (e o que não)

Em 2026-09-25, numa máquina de teste, com um banco montado pelas migrations do repositório
(`alembic upgrade head`), um administrador criado por `scripts/criar_admin.py` e um backup gerado
com **os mesmos comandos do workflow** (`pg_dump --format=custom --no-owner --no-privileges` e
`gpg --symmetric --cipher-algo AES256`):

- Senha errada: `Bad session key`, saída 2. Senha certa: saída 0, sem aviso de integridade.
- `pg_restore --list`: 25 tabelas com dados. Restauração com `--exit-on-error`: saída 0.
- Banco original e restaurado com as mesmas contagens e a mesma versão de schema (`a83f14d7e2b6`).
- API subiu no banco restaurado: `/health/db` ok, login ok, `/pessoas/` e
  `/movimentacoes-financeiras/` com 200.

Não foi possível ensaiar: o arquivo real (exige a senha do cofre e o bucket), a versão 18 do
Postgres (o ensaio usou a 16 nas duas pontas) e o pacote mensal de arquivos.

## Estado da automação

`.github/workflows/backup.yml` roda todo dia às 06:00 UTC (03:00 em Brasília) e também sob demanda
pela aba Actions. O que ele faz:

| Quando | O que gera | Onde | Retenção |
|---|---|---|---|
| Todo dia | `pg_dump -F c` do banco, criptografado com `gpg -c` (AES256) | `backups/diario/` | 30 dias |
| Todo dia | Espelho dos arquivos do Storage (`anexos_financeiros/`, `fotos_pessoas/`) | `backups/arquivos/espelho/` | Sem expiração (ver abaixo) |
| Domingos | Cópia do dump do dia | `backups/semanal/` | 6 meses |
| Dia 1 | Cópia do dump + pacote `.tar.gz` criptografado de todos os arquivos | `backups/mensal/` | 24 meses |

O job só funciona depois que os segredos do repositório forem preenchidos (a lista está no cabeçalho
do workflow). Enquanto não estiverem, ele **falha todo dia, de propósito** — um backup silencioso
que não roda é pior do que nenhum, porque passa a impressão de que existe.

### Os arquivos têm dois backups, com propósitos diferentes

O `pg_dump` não alcança os comprovantes nem as fotos: eles vivem no Storage, fora do banco. Sem
backup próprio, uma restauração devolveria as movimentações **sem os comprovantes** — exatamente o
documento que a prestação de contas exige. São duas estratégias porque as perdas são diferentes:

- **Espelho diário** (`aws s3 sync`, sem `--delete`): responde à perda mais provável do dia a dia —
  alguém remove o comprovante errado pela tela. O espelho guarda o arquivo apagado, e a cópia é
  incremental, então o custo diário é só o dos arquivos novos. Não expira por idade: apagar dele
  por tempo é justamente o que ele existe para evitar.
- **Pacote mensal** (`.tar.gz` criptografado, 24 meses): responde a "preciso dos comprovantes de
  março de dois anos atrás". O espelho não serve para isso — é um retrato do presente, sem recorte
  de data.

O espelho é a única parte que não vai criptografada: é cópia dentro do mesmo bucket, sob as mesmas
credenciais, e cifrá-la impediria conferir um comprovante sem restaurar o backup inteiro. O pacote
mensal, que é o de longo prazo, vai criptografado.

### O que mudou em relação à política acima

A política foi escrita supondo servidor próprio: cópia local em `/var/backups/acpb/` e anexos em
`backend/storage/`. A produção real é outra — Render com disco efêmero, banco no Neon e anexos no
Supabase Storage. Consequências:

- **Não há cópia local.** O disco do Render não sobrevive a um restart, então guardar backup nele
  seria ilusão. O backup nasce direto fora do provedor do banco, que é o que a regra 3-2-1 pede.
- **A criptografia usa `gpg -c` (AES256)**, não `age`: `gpg` já existe no runner, e trocar a
  ferramenta evitaria instalar uma dependência só para isso. O "Roteiro de restauração" acima já
  usa `gpg`.
- **O semanal leva só o banco**, não os arquivos. A tabela de retenção previa os arquivos em todas
  as frequências; empacotá-los 26 vezes por ano encostaria na cota de 1GB do plano gratuito do
  Supabase sem acrescentar nada que o espelho diário e o pacote mensal já não cubram.

### Pendente

- **O destino é o mesmo projeto Supabase que guarda os arquivos de produção.** Protege contra perda
  do banco no Neon, exclusão acidental pelo sistema e corrupção de dados — **não** contra perder o
  projeto Supabase inteiro (encerramento de conta, suspensão por inatividade no plano gratuito).
  Fechar essa ponta exige um segundo provedor, que é decisão da associação; o workflow já isola
  tudo em segredos `BACKUP_S3_*` separados dos da API justamente para que apontá-lo para outro
  lugar seja só trocar valores.
- **Alerta de backup ausente por mais de 48h.** Hoje a falha aparece como job vermelho no GitHub,
  que notifica quem estiver inscrito no repositório; não há verificação independente de que o
  último arquivo é recente.
- **Teste de restauração trimestral** continua sendo processo humano, e nunca foi executado com um
  arquivo real; o "Roteiro de restauração" acima diz como fazer e foi ensaiado com um backup falso. O passo
  "Resumo do que existe hoje" do workflow imprime no log o que há em cada pasta, para que a
  conferência seja ler uma tela em vez de abrir o painel do Supabase — mas ler a lista não é
  testar a restauração.
