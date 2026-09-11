# Backend do Sistema de Gestão ACPB

Este é o repositório do backend do sistema da Associação Cristã Pau-Brasil (ACPB). Ele foi desenvolvido com **FastAPI**, **SQLAlchemy**, e **PostgreSQL**.

## 1. Requisitos
- Python 3.10+
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
Preencha a variável `DATABASE_PASSWORD` com a senha do banco de dados local. **NUNCA** faça commit deste arquivo com a senha real.

## 5. Como iniciar o FastAPI
```bash
uvicorn app.main:app --reload
```
O servidor estará acessível em: `http://localhost:8000`

## 6. Como acessar a documentação Swagger
Acesse o navegador na rota `/docs`:
`http://localhost:8000/docs`

## 7. Como testar `/health`
Para verificar se a API está de pé:
`GET http://localhost:8000/health`

## 8. Como testar a conexão `/health/db`
Para verificar se o banco de dados está respondendo:
`GET http://localhost:8000/health/db`

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
de `.env`), cria o schema em `acpb_db_test` via
`Base.metadata.create_all`, e recusa a rodar caso `DATABASE_NAME` não seja
`acpb_db_test` — como proteção contra rodar a suíte contra o banco de
desenvolvimento por engano.

Para executar os testes:
```bash
pytest
```

## 10. Modelagem de dados

Todos os models de negócio (Pessoa, Membro, Voluntário, Beneficiário, Atendimento, Telefone,
Usuário, Perfil, Permissão e seus vínculos, Projeto, Evento, Inscrição, contas/categorias/
movimentações financeiras e Auditoria) estão implementados em `app/models/` e registrados em
`app/models/__init__.py`. As chaves estrangeiras, restrições de unicidade e regras de exclusão
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
descrita na tarefa 36 (`tarefas_pendentes/36-definir-backup-e-restauracao.md`).
