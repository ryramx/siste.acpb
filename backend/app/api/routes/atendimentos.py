from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.erros import tratar_integrity_error
from app.db.session import get_db
from app.models.atendimento import Atendimento
from app.models.beneficiario import Beneficiario
from app.models.pessoa import Pessoa
from app.schemas.atendimento import AtendimentoCreate, AtendimentoResponse, AtendimentoUpdate

router = APIRouter()

# Atendimento é um registro sensível de beneficiário — reaproveita as permissões de
# "beneficiarios" (não há módulo de permissão dedicado; ver RBAC.md).
_visualizar = [Depends(require_permission("beneficiarios.visualizar"))]
_criar = [Depends(require_permission("beneficiarios.criar"))]
_editar = [Depends(require_permission("beneficiarios.editar"))]


@router.get("/", response_model=list[AtendimentoResponse], dependencies=_visualizar)
def listar_atendimentos(beneficiario_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Atendimento)
    if beneficiario_id is not None:
        query = query.filter(Atendimento.beneficiario_id == beneficiario_id)
    return query.order_by(Atendimento.data_atendimento.desc()).all()


@router.get("/{id}", response_model=AtendimentoResponse, dependencies=_visualizar)
def obter_atendimento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Atendimento).filter(Atendimento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")
    return obj


@router.post(
    "/", response_model=AtendimentoResponse, status_code=status.HTTP_201_CREATED, dependencies=_criar
)
def criar_atendimento(obj_in: AtendimentoCreate, db: Session = Depends(get_db)):
    if not db.query(Beneficiario).filter(Beneficiario.id == obj_in.beneficiario_id).first():
        raise HTTPException(status_code=404, detail="Beneficiário não encontrado")
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.responsavel_id).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")

    agora = datetime.utcnow()
    obj = Atendimento(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.put("/{id}", response_model=AtendimentoResponse, dependencies=_editar)
def atualizar_atendimento(id: int, obj_in: AtendimentoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Atendimento).filter(Atendimento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")

    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_editar)
def deletar_atendimento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Atendimento).filter(Atendimento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Atendimento não encontrado")

    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
