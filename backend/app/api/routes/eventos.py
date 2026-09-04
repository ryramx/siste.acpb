from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.evento import Evento
from app.schemas.evento import EventoCreate, EventoUpdate, EventoResponse

router = APIRouter()

@router.get("/", response_model=list[EventoResponse])
def listar_eventos(db: Session = Depends(get_db)):
    return db.query(Evento).all()

@router.get("/{id}", response_model=EventoResponse)
def obter_evento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    return obj

@router.post("/", response_model=EventoResponse, status_code=status.HTTP_201_CREATED)
def criar_evento(obj_in: EventoCreate, db: Session = Depends(get_db)):
    obj = Evento(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=EventoResponse)
def atualizar_evento(id: int, obj_in: EventoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    
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
def deletar_evento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
