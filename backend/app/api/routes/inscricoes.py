from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.evento import Evento
from app.models.inscricao import Inscricao
from app.models.pessoa import Pessoa
from app.schemas.inscricao import InscricaoCreate, InscricaoUpdate, InscricaoResponse

router = APIRouter()

@router.get("/", response_model=list[InscricaoResponse], dependencies=[Depends(require_permission("inscricoes.visualizar"))])
def listar_inscricoes(
    evento_id: int | None = None,
    pessoa_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Inscricao)
    if evento_id is not None:
        query = query.filter(Inscricao.evento_id == evento_id)
    if pessoa_id is not None:
        query = query.filter(Inscricao.pessoa_id == pessoa_id)
    return query.all()

@router.get("/{id}", response_model=InscricaoResponse, dependencies=[Depends(require_permission("inscricoes.visualizar"))])
def obter_inscricao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
    return obj

@router.post("/", response_model=InscricaoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("inscricoes.criar"))])
def criar_inscricao(obj_in: InscricaoCreate, db: Session = Depends(get_db)):
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    if not db.query(Evento).filter(Evento.id == obj_in.evento_id).first():
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    agora = datetime.utcnow()
    obj = Inscricao(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=InscricaoResponse, dependencies=[Depends(require_permission("inscricoes.editar"))])
def atualizar_inscricao(id: int, obj_in: InscricaoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
    
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("inscricoes.editar"))])
def deletar_inscricao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
