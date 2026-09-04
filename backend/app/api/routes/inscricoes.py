from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.inscricao import Inscricao
from app.schemas.inscricao import InscricaoCreate, InscricaoUpdate, InscricaoResponse

router = APIRouter()

@router.get("/", response_model=list[InscricaoResponse])
def listar_inscricoes(db: Session = Depends(get_db)):
    return db.query(Inscricao).all()

@router.get("/{id}", response_model=InscricaoResponse)
def obter_inscricao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
    return obj

@router.post("/", response_model=InscricaoResponse, status_code=status.HTTP_201_CREATED)
def criar_inscricao(obj_in: InscricaoCreate, db: Session = Depends(get_db)):
    obj = Inscricao(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=InscricaoResponse)
def atualizar_inscricao(id: int, obj_in: InscricaoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
    
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
