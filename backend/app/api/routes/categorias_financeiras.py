from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.categoria_financeira import CategoriaFinanceira
from app.schemas.categoria_financeira import CategoriaFinanceiraCreate, CategoriaFinanceiraUpdate, CategoriaFinanceiraResponse

router = APIRouter()

@router.get("/", response_model=list[CategoriaFinanceiraResponse])
def listar_categorias_financeiras(db: Session = Depends(get_db)):
    return db.query(CategoriaFinanceira).all()

@router.get("/{id}", response_model=CategoriaFinanceiraResponse)
def obter_categoria_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="CategoriaFinanceira não encontrado(a)")
    return obj

@router.post("/", response_model=CategoriaFinanceiraResponse, status_code=status.HTTP_201_CREATED)
def criar_categoria_financeira(obj_in: CategoriaFinanceiraCreate, db: Session = Depends(get_db)):
    obj = CategoriaFinanceira(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=CategoriaFinanceiraResponse)
def atualizar_categoria_financeira(id: int, obj_in: CategoriaFinanceiraUpdate, db: Session = Depends(get_db)):
    obj = db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="CategoriaFinanceira não encontrado(a)")
    
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
def deletar_categoria_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="CategoriaFinanceira não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
