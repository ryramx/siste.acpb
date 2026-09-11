from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.evento import Evento
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.schemas.evento import EventoCreate, EventoUpdate, EventoResponse

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if dados.get("responsavel_id") is not None and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")
    if dados.get("projeto_id") is not None and not db.query(Projeto).filter(
        Projeto.id == dados["projeto_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

@router.get("/", response_model=list[EventoResponse], dependencies=[Depends(require_permission("eventos.visualizar"))])
def listar_eventos(db: Session = Depends(get_db)):
    return db.query(Evento).all()

@router.get("/{id}", response_model=EventoResponse, dependencies=[Depends(require_permission("eventos.visualizar"))])
def obter_evento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    return obj

@router.post("/", response_model=EventoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("eventos.criar"))])
def criar_evento(obj_in: EventoCreate, db: Session = Depends(get_db)):
    _validar_referencias(db, obj_in.model_dump())
    agora = datetime.utcnow()
    obj = Evento(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=EventoResponse, dependencies=[Depends(require_permission("eventos.editar"))])
def atualizar_evento(id: int, obj_in: EventoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    _validar_referencias(db, update_data)
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("eventos.editar"))])
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
