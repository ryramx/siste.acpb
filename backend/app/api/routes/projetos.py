from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.projeto import Projeto
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse

router = APIRouter()

@router.get("/", response_model=list[ProjetoResponse])
def listar_projetos(db: Session = Depends(get_db)):
    return db.query(Projeto).all()

@router.get("/{id}", response_model=ProjetoResponse)
def obter_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    return obj

@router.post("/", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
def criar_projeto(obj_in: ProjetoCreate, db: Session = Depends(get_db)):
    obj = Projeto(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=ProjetoResponse)
def atualizar_projeto(id: int, obj_in: ProjetoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    
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
def deletar_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
