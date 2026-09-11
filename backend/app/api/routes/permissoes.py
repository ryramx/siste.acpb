from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.permissao import Permissao
from app.schemas.permissao import PermissaoCreate, PermissaoResponse, PermissaoUpdate

router = APIRouter()

# Administrar a matriz de RBAC (perfis, permissões e vínculos) é restrito a quem administra
# usuários — não há um módulo de permissão dedicado a "rbac" (ver RBAC.md).
_gerenciar = [Depends(require_permission("usuarios.editar"))]
_visualizar = [Depends(require_permission("usuarios.visualizar"))]


@router.get("/", response_model=list[PermissaoResponse], dependencies=_visualizar)
def listar_permissoes(db: Session = Depends(get_db)):
    return db.query(Permissao).all()


@router.get("/{id}", response_model=PermissaoResponse, dependencies=_visualizar)
def obter_permissao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Permissao).filter(Permissao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Permissão não encontrada")
    return obj


@router.post(
    "/", response_model=PermissaoResponse, status_code=status.HTTP_201_CREATED, dependencies=_gerenciar
)
def criar_permissao(obj_in: PermissaoCreate, db: Session = Depends(get_db)):
    agora = datetime.utcnow()
    obj = Permissao(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma permissão com este nome")
    return obj


@router.put("/{id}", response_model=PermissaoResponse, dependencies=_gerenciar)
def atualizar_permissao(id: int, obj_in: PermissaoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Permissao).filter(Permissao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Permissão não encontrada")

    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma permissão com este nome")
    return obj
