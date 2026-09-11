from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.cargo import Cargo
from app.models.membro import Membro
from app.models.pessoa import Pessoa
from app.schemas.membro import MembroCreate, MembroUpdate, MembroResponse

router = APIRouter()

@router.get("/", response_model=list[MembroResponse], dependencies=[Depends(require_permission("membros.visualizar"))])
def listar_membros(db: Session = Depends(get_db)):
    return db.query(Membro).all()

@router.get("/{id}", response_model=MembroResponse, dependencies=[Depends(require_permission("membros.visualizar"))])
def obter_membro(id: int, db: Session = Depends(get_db)):
    obj = db.query(Membro).filter(Membro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Membro não encontrado(a)")
    return obj

@router.post("/", response_model=MembroResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("membros.criar"))])
def criar_membro(obj_in: MembroCreate, db: Session = Depends(get_db)):
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    if not db.query(Cargo).filter(Cargo.id == obj_in.cargo_id).first():
        raise HTTPException(status_code=404, detail="Cargo não encontrado")

    agora = datetime.utcnow()
    obj = Membro(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=MembroResponse, dependencies=[Depends(require_permission("membros.editar"))])
def atualizar_membro(id: int, obj_in: MembroUpdate, db: Session = Depends(get_db)):
    obj = db.query(Membro).filter(Membro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Membro não encontrado(a)")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    if "cargo_id" in update_data and not db.query(Cargo).filter(Cargo.id == update_data["cargo_id"]).first():
        raise HTTPException(status_code=404, detail="Cargo não encontrado")

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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("membros.editar"))])
def deletar_membro(id: int, db: Session = Depends(get_db)):
    obj = db.query(Membro).filter(Membro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Membro não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
