from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import Request
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.models.auditoria import Auditoria

# Campos que nunca devem ir para o log de auditoria, mesmo que existam no model (segredos).
CAMPOS_SENSIVEIS = {"senha_hash", "token_hash"}


def model_to_dict(obj: Any) -> dict[str, Any]:
    """Serializa as colunas de um model SQLAlchemy para um dict JSON-serializável,
    omitindo campos sensíveis (ver CAMPOS_SENSIVEIS)."""
    resultado: dict[str, Any] = {}
    for coluna in inspect(obj).mapper.column_attrs:
        if coluna.key in CAMPOS_SENSIVEIS:
            continue
        valor = getattr(obj, coluna.key)
        if isinstance(valor, (datetime, date)):
            valor = valor.isoformat()
        elif isinstance(valor, Decimal):
            valor = float(valor)
        resultado[coluna.key] = valor
    return resultado


def obter_ip_cliente(request: Request) -> str | None:
    return request.client.host if request.client else None


def registrar_auditoria(
    db: Session,
    *,
    usuario_id: int | None,
    acao: str,
    tabela: str | None = None,
    registro_id: int | None = None,
    descricao: str | None = None,
    dados_anteriores: dict[str, Any] | None = None,
    dados_novos: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    """Registra um evento de auditoria. Não faz commit — o chamador deve commitar na mesma
    transação da operação de negócio, para que auditoria e efeito fiquem atômicos."""
    db.add(
        Auditoria(
            usuario_id=usuario_id,
            acao=acao,
            tabela=tabela,
            registro_id=registro_id,
            descricao=descricao,
            dados_anteriores=dados_anteriores,
            dados_novos=dados_novos,
            ip=ip,
            created_at=datetime.utcnow(),
        )
    )
