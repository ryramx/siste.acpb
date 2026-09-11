from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.beneficiario import Beneficiario
from app.models.pessoa import Pessoa
from app.schemas.beneficiario import BeneficiarioCreate, BeneficiarioUpdate, BeneficiarioResponse

router = APIRouter()

@router.get("/", response_model=list[BeneficiarioResponse], dependencies=[Depends(require_permission("beneficiarios.visualizar"))])
def listar_beneficiarios(db: Session = Depends(get_db)):
    return db.query(Beneficiario).all()

@router.get("/{id}", response_model=BeneficiarioResponse, dependencies=[Depends(require_permission("beneficiarios.visualizar"))])
def obter_beneficiario(id: int, db: Session = Depends(get_db)):
    obj = db.query(Beneficiario).filter(Beneficiario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Beneficiario não encontrado(a)")
    return obj

@router.post("/", response_model=BeneficiarioResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("beneficiarios.criar"))])
def criar_beneficiario(obj_in: BeneficiarioCreate, db: Session = Depends(get_db)):
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    agora = datetime.utcnow()
    obj = Beneficiario(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=BeneficiarioResponse, dependencies=[Depends(require_permission("beneficiarios.editar"))])
def atualizar_beneficiario(id: int, obj_in: BeneficiarioUpdate, db: Session = Depends(get_db)):
    obj = db.query(Beneficiario).filter(Beneficiario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Beneficiario não encontrado(a)")
    
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("beneficiarios.editar"))])
def deletar_beneficiario(id: int, db: Session = Depends(get_db)):
    obj = db.query(Beneficiario).filter(Beneficiario.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Beneficiario não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
