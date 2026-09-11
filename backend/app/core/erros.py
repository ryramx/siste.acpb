from fastapi import HTTPException
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from sqlalchemy.exc import IntegrityError


def tratar_integrity_error(exc: IntegrityError) -> HTTPException:
    """Traduz uma violação de integridade do Postgres em uma resposta HTTP compreensível,
    em vez de deixar o erro 500 genérico do driver vazar para o cliente (tarefa 18)."""
    orig = getattr(exc, "orig", None)
    if isinstance(orig, UniqueViolation):
        return HTTPException(
            status_code=409,
            detail="Já existe um registro com esses dados (violação de unicidade)",
        )
    if isinstance(orig, ForeignKeyViolation):
        return HTTPException(
            status_code=400,
            detail="Referência inválida: um dos identificadores informados não existe",
        )
    return HTTPException(status_code=400, detail="Erro de integridade nos dados informados")
