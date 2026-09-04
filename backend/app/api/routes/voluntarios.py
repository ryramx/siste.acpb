from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.voluntario import Voluntario
from app.schemas.voluntario import VoluntarioCreate, VoluntarioUpdate, VoluntarioResponse

router = APIRouter()

@router.get("/", response_model=list[VoluntarioResponse])
def listar_voluntarios(db: Session = Depends(get_db)):
    return db.query(Voluntario).all()

@router.get("/{id}", response_model=VoluntarioResponse)
def obter_voluntario(id: int, db: Session = Depends(get_db)):
    obj = db.query(Voluntario).filter(Voluntario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Voluntario não encontrado(a)")
    return obj

@router.post("/", response_model=VoluntarioResponse, status_code=status.HTTP_201_CREATED)
def criar_voluntario(obj_in: VoluntarioCreate, db: Session = Depends(get_db)):
    obj = Voluntario(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=VoluntarioResponse)
def atualizar_voluntario(id: int, obj_in: VoluntarioUpdate, db: Session = Depends(get_db)):
    obj = db.query(Voluntario).filter(Voluntario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Voluntario não encontrado(a)")
    
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
def deletar_voluntario(id: int, db: Session = Depends(get_db)):
    obj = db.query(Voluntario).filter(Voluntario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Voluntario não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
