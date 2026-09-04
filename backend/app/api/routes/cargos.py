from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.cargo import Cargo
from app.schemas.cargo import CargoCreate, CargoUpdate, CargoResponse

router = APIRouter()

@router.get("/", response_model=list[CargoResponse])
def listar_cargos(db: Session = Depends(get_db)):
    return db.query(Cargo).all()

@router.get("/{id}", response_model=CargoResponse)
def obter_cargo(id: int, db: Session = Depends(get_db)):
    obj = db.query(Cargo).filter(Cargo.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cargo não encontrado(a)")
    return obj

@router.post("/", response_model=CargoResponse, status_code=status.HTTP_201_CREATED)
def criar_cargo(obj_in: CargoCreate, db: Session = Depends(get_db)):
    obj = Cargo(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=CargoResponse)
def atualizar_cargo(id: int, obj_in: CargoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Cargo).filter(Cargo.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cargo não encontrado(a)")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
        
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
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
