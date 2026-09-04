from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.routes.health import get_db
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.schemas.movimentacao_financeira import MovimentacaoFinanceiraCreate, MovimentacaoFinanceiraUpdate, MovimentacaoFinanceiraResponse

router = APIRouter()

@router.get("/", response_model=list[MovimentacaoFinanceiraResponse])
def listar_movimentacoes_financeiras(db: Session = Depends(get_db)):
    return db.query(MovimentacaoFinanceira).all()

@router.get("/{id}", response_model=MovimentacaoFinanceiraResponse)
def obter_movimentacao_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")
    return obj

@router.post("/", response_model=MovimentacaoFinanceiraResponse, status_code=status.HTTP_201_CREATED)
def criar_movimentacao_financeira(obj_in: MovimentacaoFinanceiraCreate, db: Session = Depends(get_db)):
    obj = MovimentacaoFinanceira(**obj_in.model_dump())
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=MovimentacaoFinanceiraResponse)
def atualizar_movimentacao_financeira(id: int, obj_in: MovimentacaoFinanceiraUpdate, db: Session = Depends(get_db)):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")
    
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
def deletar_movimentacao_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
