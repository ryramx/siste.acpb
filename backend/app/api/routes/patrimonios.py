from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.core.erros import tratar_integrity_error
from app.db.session import get_db
from app.models.patrimonio import Patrimonio
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.schemas.patrimonio import PatrimonioCreate, PatrimonioResponse, PatrimonioUpdate

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if dados.get("responsavel_id") is not None and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")


@router.get(
    "/",
    response_model=list[PatrimonioResponse],
    dependencies=[Depends(require_permission("patrimonio.visualizar"))],
)
def listar_patrimonios(
    categoria: str | None = None,
    status_filtro: str | None = None,
    responsavel_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Patrimonio)
    if categoria is not None:
        query = query.filter(Patrimonio.categoria.ilike(categoria))
    if status_filtro is not None:
        query = query.filter(Patrimonio.status == status_filtro.upper())
    if responsavel_id is not None:
        query = query.filter(Patrimonio.responsavel_id == responsavel_id)
    return query.order_by(Patrimonio.codigo).all()


@router.get(
    "/{id}",
    response_model=PatrimonioResponse,
    dependencies=[Depends(require_permission("patrimonio.visualizar"))],
)
def obter_patrimonio(id: int, db: Session = Depends(get_db)):
    obj = db.query(Patrimonio).filter(Patrimonio.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Patrimônio não encontrado")
    return obj


@router.post(
    "/",
    response_model=PatrimonioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("patrimonio.criar"))],
)
def criar_patrimonio(
    obj_in: PatrimonioCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    dados = obj_in.model_dump()
    _validar_referencias(db, dados)

    agora = datetime.utcnow()
    obj = Patrimonio(**dados, created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="patrimonios",
            registro_id=obj.id,
            dados_novos=model_to_dict(obj),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.put(
    "/{id}",
    response_model=PatrimonioResponse,
    dependencies=[Depends(require_permission("patrimonio.editar"))],
)
def atualizar_patrimonio(
    id: int,
    obj_in: PatrimonioUpdate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(Patrimonio).filter(Patrimonio.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Patrimônio não encontrado")

    dados_anteriores = model_to_dict(obj)
    update_data = obj_in.model_dump(exclude_unset=True)
    _validar_referencias(db, update_data)
    for campo, valor in update_data.items():
        setattr(obj, campo, valor)
    obj.updated_at = datetime.utcnow()

    try:
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="editar",
            tabela="patrimonios",
            registro_id=obj.id,
            dados_anteriores=dados_anteriores,
            dados_novos=model_to_dict(obj),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("patrimonio.editar"))],
)
def deletar_patrimonio(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(Patrimonio).filter(Patrimonio.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Patrimônio não encontrado")

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="patrimonios",
        registro_id=obj.id,
        dados_anteriores=model_to_dict(obj),
        ip=obter_ip_cliente(request),
    )
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir devido a dependências (Integridade referencial)",
        )
    return None
