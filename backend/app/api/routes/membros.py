from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.membro import Membro
from app.schemas.membro import MembroCreate, MembroUpdate, MembroResponse

router = APIRouter()

@router.get("/", response_model=list[MembroResponse])
def listar_membros(db: Session = Depends(get_db)):
    return db.query(Membro).all()

@router.get("/{id}", response_model=MembroResponse)
def obter_membro(id: int, db: Session = Depends(get_db)):
    obj = db.query(Membro).filter(Membro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Membro não encontrado(a)")
    return obj

@router.post("/", response_model=MembroResponse, status_code=status.HTTP_201_CREATED)
def criar_membro(obj_in: MembroCreate, db: Session = Depends(get_db)):
    obj = Membro(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=MembroResponse)
def atualizar_membro(id: int, obj_in: MembroUpdate, db: Session = Depends(get_db)):
    obj = db.query(Membro).filter(Membro.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Membro não encontrado(a)")
    
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
