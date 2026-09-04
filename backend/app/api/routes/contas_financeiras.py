from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.conta_financeira import ContaFinanceira
from app.schemas.conta_financeira import ContaFinanceiraCreate, ContaFinanceiraUpdate, ContaFinanceiraResponse

router = APIRouter()

@router.get("/", response_model=list[ContaFinanceiraResponse])
def listar_contas_financeiras(db: Session = Depends(get_db)):
    return db.query(ContaFinanceira).all()

@router.get("/{id}", response_model=ContaFinanceiraResponse)
def obter_conta_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(ContaFinanceira).filter(ContaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="ContaFinanceira não encontrado(a)")
    return obj

@router.post("/", response_model=ContaFinanceiraResponse, status_code=status.HTTP_201_CREATED)
def criar_conta_financeira(obj_in: ContaFinanceiraCreate, db: Session = Depends(get_db)):
    obj = ContaFinanceira(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=ContaFinanceiraResponse)
def atualizar_conta_financeira(id: int, obj_in: ContaFinanceiraUpdate, db: Session = Depends(get_db)):
    obj = db.query(ContaFinanceira).filter(ContaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="ContaFinanceira não encontrado(a)")
    
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
def deletar_conta_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(ContaFinanceira).filter(ContaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="ContaFinanceira não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
