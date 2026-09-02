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
Nós usamos o `pytest` para testes. Para executá-los:
```bash
pytest
```

## 10. Como executar o Alembic (Migrations)
Neste momento, a infraestrutura inicial do backend está configurada, mas **não existem models, tabelas ou migrations de negócio**. 

Rodar comandos como `alembic upgrade head` neste momento servirá apenas para testar a ferramenta, mas **não criará** as tabelas do sistema ACPB, visto que a modelagem do banco de dados (DER) ainda não foi implementada.
