# 02 — Registrar todos os models

**Depende de:** 01

Importar todos os models em `backend/app/models/__init__.py` e garantir que `backend/alembic/env.py` importe o módulo antes de ler `Base.metadata`.

**Concluído quando:** um teste confirma que as tabelas esperadas estão em `Base.metadata.tables`.
