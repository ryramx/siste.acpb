from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.auditoria import Auditoria
from app.schemas.auditoria import AuditoriaResponse

router = APIRouter()


@router.get(
    "/",
    response_model=list[AuditoriaResponse],
    dependencies=[Depends(require_permission("auditoria.visualizar"))],
)
def listar_auditoria(
    usuario_id: int | None = None,
    tabela: str | None = None,
    acao: str | None = None,
    registro_id: int | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    limit: int = Query(default=100, le=500, gt=0),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Auditoria)

    if usuario_id is not None:
        query = query.filter(Auditoria.usuario_id == usuario_id)
    if tabela is not None:
        query = query.filter(Auditoria.tabela == tabela)
    if acao is not None:
        query = query.filter(Auditoria.acao == acao)
    if registro_id is not None:
        query = query.filter(Auditoria.registro_id == registro_id)
    if data_inicio is not None:
        query = query.filter(Auditoria.created_at >= data_inicio)
    if data_fim is not None:
        query = query.filter(Auditoria.created_at <= data_fim)

    return (
        query.order_by(Auditoria.created_at.desc()).offset(offset).limit(limit).all()
    )
