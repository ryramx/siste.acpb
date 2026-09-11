from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.erros import tratar_integrity_error
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.pessoa import Pessoa
from app.models.telefone import Telefone
from app.schemas.telefone import TelefoneCreate, TelefoneResponse, TelefoneUpdate

router = APIRouter()

# Telefone é um dado de cadastro de Pessoa — reaproveita as permissões de "pessoas" (ver RBAC.md).
_visualizar = [Depends(require_permission("pessoas.visualizar"))]
_editar = [Depends(require_permission("pessoas.editar"))]


def _desmarcar_principal_atual(db: Session, pessoa_id: int, excluir_id: int | None = None) -> None:
    query = db.query(Telefone).filter(
        Telefone.pessoa_id == pessoa_id, Telefone.principal.is_(True)
    )
    if excluir_id is not None:
        query = query.filter(Telefone.id != excluir_id)
    query.update({"principal": False})


@router.get("/", response_model=list[TelefoneResponse], dependencies=_visualizar)
def listar_telefones(pessoa_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Telefone)
    if pessoa_id is not None:
        query = query.filter(Telefone.pessoa_id == pessoa_id)
    return query.all()


@router.get("/{id}", response_model=TelefoneResponse, dependencies=_visualizar)
def obter_telefone(id: int, db: Session = Depends(get_db)):
    obj = db.query(Telefone).filter(Telefone.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Telefone não encontrado")
    return obj


@router.post(
    "/", response_model=TelefoneResponse, status_code=status.HTTP_201_CREATED, dependencies=_editar
)
def criar_telefone(obj_in: TelefoneCreate, db: Session = Depends(get_db)):
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    # Garante no máximo um telefone principal por pessoa (também reforçado por índice único
    # parcial no banco — ver RELACIONAMENTOS.md): ao marcar um novo como principal, desmarca
    # o anterior em vez de deixar o usuário tratar um erro de conflito.
    if obj_in.principal:
        _desmarcar_principal_atual(db, obj_in.pessoa_id)

    obj = Telefone(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.put("/{id}", response_model=TelefoneResponse, dependencies=_editar)
def atualizar_telefone(id: int, obj_in: TelefoneUpdate, db: Session = Depends(get_db)):
    obj = db.query(Telefone).filter(Telefone.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Telefone não encontrado")

    update_data = obj_in.model_dump(exclude_unset=True)
    if update_data.get("principal") is True:
        _desmarcar_principal_atual(db, obj.pessoa_id, excluir_id=obj.id)

    for key, value in update_data.items():
        setattr(obj, key, value)

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_editar)
def deletar_telefone(id: int, db: Session = Depends(get_db)):
    obj = db.query(Telefone).filter(Telefone.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Telefone não encontrado")

    db.delete(obj)
    db.commit()
    return None
