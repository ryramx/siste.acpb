# Backend do Sistema de Gestão ACPB

API do sistema da Associação Cristã Pau-Brasil (ACPB), construída com **FastAPI**,
**SQLAlchemy** e **PostgreSQL**. Vive na pasta `backend/` do repositório; o front-end React
fica na raiz.

Em produção roda no Render, com banco PostgreSQL no Neon e anexos em object storage
S3-compatível (Supabase Storage). Ver [`DEPLOY.md`](DEPLOY.md).

## 1. Requisitos
- Python 3.12 (versão fixada no CI e em produção; ver `.github/workflows/ci.yml` e `render.yaml`)
- PostgreSQL rodando localmente

## 2. Como criar e ativar o ambiente virtual
Abra um terminal na pasta `backend` e execute:
```bash
python -m venv venv
```
Para ativar no Windows:
```bash
.\venv\Scripts\activate
```
Para ativar no Linux/Mac:
```bash
source venv/bin/activate
```

## 3. Como instalar as dependências
Com o ambiente virtual ativado, execute:
```bash
pip install -r requirements.txt
```

## 4. Como configurar o `.env`
O sistema usa um arquivo `.env` para carregar as variáveis de ambiente.
Copie o arquivo `.env.example` e renomeie para `.env`.

Duas variáveis precisam ser preenchidas para a API funcionar localmente:

- `DATABASE_PASSWORD` — a senha do banco local;
- `JWT_SECRET_KEY` — qualquer valor em desenvolvimento. Sem ele os tokens são assinados com
  string vazia. Em produção a aplicação **se recusa a subir** se estiver em branco.

**NUNCA** faça commit deste arquivo com a senha real.

As demais variáveis do `.env.example` já vêm com valores de desenvolvimento utilizáveis:
`STORAGE_BACKEND=local` guarda anexos e fotos em disco (em produção é `s3`, porque o disco
do Render é efêmero), e `BACKEND_CORS_ORIGINS` já aponta para a porta do front-end.

## 5. Como iniciar o FastAPI
```bash
uvicorn app.main:app --reload --port 8001
```
O servidor estará acessível em: `http://localhost:8001`

> A porta é **8001**, e não a 8000 padrão do uvicorn, para conviver com outro projeto na
> mesma máquina. O front-end procura a API nesse endereço quando `VITE_API_URL` não está
> definida, então subir na 8000 faz a interface abrir sem conseguir falar com a API.
> Ver [`DEPLOY.md`](DEPLOY.md).

## 6. Como acessar a documentação Swagger
Acesse o navegador na rota `/docs`:
`http://localhost:8001/docs`

## 7. Como testar `/health`
Para verificar se a API está de pé:
`GET http://localhost:8001/health`

Este health check **não** consulta o banco, de propósito: é o que o Render usa como
liveness, e um PostgreSQL fora do ar não deve derrubar o serviço.

## 8. Como testar a conexão `/health/db`
Para verificar se o banco de dados está respondendo:
`GET http://localhost:8001/health/db`

## 9. Como executar os testes
Nós usamos o `pytest` para testes. A suíte usa um banco de dados **isolado** do
banco de desenvolvimento, chamado `acpb_db_test`, para que rodar `pytest`
nunca modifique os dados de `acpb_db`.

Antes de rodar os testes pela primeira vez:

1. Crie o banco `acpb_db_test` no PostgreSQL local (usuário `acpb_app` não tem
   privilégio `CREATEDB`, então isso precisa ser feito uma vez com um usuário
   com permissão, ex.: `postgres`):
   ```sql
   CREATE DATABASE acpb_db_test OWNER acpb_app;
   ```
2. Copie `.env.test.example` para `.env.test` e preencha `DATABASE_PASSWORD`.
   **NUNCA** faça commit deste arquivo com a senha real.

O `conftest.py` da raiz de `backend/` força `ENVIRONMENT=test` antes de
qualquer import da aplicação (fazendo `Settings` carregar `.env.test` em vez
de `.env`) e recusa a rodar caso `DATABASE_NAME` não seja `acpb_db_test` — como
proteção contra rodar a suíte contra o banco de desenvolvimento por engano.

O schema do banco de testes é montado com `alembic upgrade head`, e **não** com
`Base.metadata.create_all`. A diferença importa: `create_all` cria tabelas a partir dos
models e ignora as migrations, de modo que uma migration quebrada passaria despercebida
pela suíte inteira e só apareceria no deploy. Rodando as migrations, o banco de testes
fica idêntico ao de produção.

Para executar os testes:
```bash
pytest
```

A suíte tem **153 testes** e roda no CI a cada `push` e `pull request`, contra um
PostgreSQL 16 levantado pelo próprio workflow — ver
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## 10. Modelagem de dados

Todos os models de negócio estão implementados em `app/models/` e registrados em
`app/models/__init__.py`: Pessoa, Membro, Cargo, Voluntário, Beneficiário, Atendimento,
Telefone, Usuário, Perfil, Permissão e seus vínculos, Projeto e seus vínculos com
voluntários e beneficiários, Evento, Inscrição, contas/categorias/movimentações
financeiras, Anexo financeiro, Patrimônio, Auditoria e token de redefinição de senha.

Ainda não modelados: **Estoque** e **Doações**. As chaves estrangeiras, restrições de unicidade e regras de exclusão
seguem o inventário documentado em [`RELACIONAMENTOS.md`](RELACIONAMENTOS.md) — consulte esse
arquivo antes de alterar qualquer relacionamento.

## 11. Como executar o Alembic (Migrations)

O schema completo é versionado a partir da migration baseline em `alembic/versions/`, que cria
todas as tabelas, índices e FKs em um banco limpo:

```bash
alembic upgrade head
```

Para gerar uma nova migration após alterar models:

```bash
alembic revision --autogenerate -m "descricao da mudanca"
```

Sempre revise o arquivo gerado antes de aplicar. Em bancos que já possuem dados, **nunca** rode
`alembic upgrade head` sem antes conferir se a operação é destrutiva — prefira gerar um backup
(`pg_dump`) e, se o schema já existir fisicamente e a migration só estiver documentando o estado
atual, aplique com `alembic stamp <revisao>` em vez de `upgrade`.

Para verificar se os models estão sincronizados com o banco sem gerar uma migration:

```bash
alembic check
```

## 12. Backups

Backups gerados com `pg_dump` (formato custom, `-F c`) devem ficar em `backend/backups/`, pasta
ignorada pelo git por conter dados pessoais. Exemplo de geração de backup antes de qualquer
migration em banco com dados:

```bash
pg_dump -h localhost -p 5432 -U acpb_app -d acpb_db -F c -f backups/acpb_db_AAAAMMDD_HHMMSS.dump
```

A política completa de backup/restauração (periodicidade, retenção e teste de restauração) está
em [`BACKUP_E_RESTAURACAO.md`](BACKUP_E_RESTAURACAO.md). Há também um backup automatizado por
GitHub Actions em [`.github/workflows/backup.yml`](../.github/workflows/backup.yml).

## 13. Demais documentos

| Documento | Conteúdo |
| --------- | -------- |
| [`RELACIONAMENTOS.md`](RELACIONAMENTOS.md) | Inventário de tabelas, FKs e regras de exclusão |
| [`AUTENTICACAO.md`](AUTENTICACAO.md) | Política de autenticação, tokens e recuperação de senha |
| [`RBAC.md`](RBAC.md) | Matriz de perfis × permissões |
| [`CORS_E_PRODUCAO.md`](CORS_E_PRODUCAO.md) | CORS e validações obrigatórias em produção |
| [`DEPLOY.md`](DEPLOY.md) | Deploy no Render, portas locais, health checks, logs e rollback |
| [`BACKUP_E_RESTAURACAO.md`](BACKUP_E_RESTAURACAO.md) | Backup, retenção e teste de restauração |
| [`PRIVACIDADE_E_RETENCAO.md`](PRIVACIDADE_E_RETENCAO.md) | Dados pessoais e política de retenção |

A visão geral do sistema, incluindo o front-end, está no
[`README.md` da raiz](../README.md).
