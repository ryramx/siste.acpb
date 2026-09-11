from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.cargo import Cargo
from app.schemas.cargo import CargoCreate, CargoUpdate, CargoResponse

router = APIRouter()

@router.get("/", response_model=list[CargoResponse], dependencies=[Depends(require_permission("membros.visualizar"))])
def listar_cargos(db: Session = Depends(get_db)):
    return db.query(Cargo).all()

@router.get("/{id}", response_model=CargoResponse, dependencies=[Depends(require_permission("membros.visualizar"))])
def obter_cargo(id: int, db: Session = Depends(get_db)):
    obj = db.query(Cargo).filter(Cargo.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cargo não encontrado(a)")
    return obj

@router.post("/", response_model=CargoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("membros.criar"))])
def criar_cargo(obj_in: CargoCreate, db: Session = Depends(get_db)):
    agora = datetime.utcnow()
    obj = Cargo(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=CargoResponse, dependencies=[Depends(require_permission("membros.editar"))])
def atualizar_cargo(id: int, obj_in: CargoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Cargo).filter(Cargo.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cargo não encontrado(a)")
    
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("membros.editar"))])
def deletar_cargo(id: int, db: Session = Depends(get_db)):
    obj = db.query(Cargo).filter(Cargo.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cargo não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
