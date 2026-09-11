# 05 — Gerar e aplicar a migration inicial

**Depende de:** 02, 03 e 04

Antes de executar, verificar se existe banco com dados e definir baseline/backup. Gerar `alembic revision --autogenerate`, revisar o arquivo, aplicar com `alembic upgrade head` e validar o schema.

**Concluído quando:** migration versionada cria todas as tabelas, índices e FKs em banco limpo.
