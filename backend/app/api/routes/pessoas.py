from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from app.api.routes.health import get_db
from app.models.pessoa import Pessoa
from app.schemas.pessoa import PessoaCreate, PessoaUpdate, PessoaResponse

router = APIRouter()

@router.get("/", response_model=list[PessoaResponse])
def listar_pessoas(
    db: Session = Depends(get_db)
):
    pessoas = db.query(Pessoa).all()
    return pessoas

@router.get("/{id}", response_model=PessoaResponse)
def obter_pessoa(
    id: int,
    db: Session = Depends(get_db)
):
    pessoa = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    return pessoa

@router.post("/", response_model=PessoaResponse, status_code=status.HTTP_201_CREATED)
def criar_pessoa(
    obj_in: PessoaCreate,
    db: Session = Depends(get_db)
):
    if obj_in.cpf:
        existing = db.query(Pessoa).filter(Pessoa.cpf == obj_in.cpf).first()
        if existing:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

    obj_data = obj_in.model_dump()
    obj_data['created_at'] = datetime.utcnow()
    obj_data['updated_at'] = datetime.utcnow()
    
    obj = Pessoa(**obj_data)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.put("/{id}", response_model=PessoaResponse)
def atualizar_pessoa(
    id: int,
    obj_in: PessoaUpdate,
    db: Session = Depends(get_db)
):
    obj = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    
    if obj_in.cpf and obj_in.cpf != obj.cpf:
        existing = db.query(Pessoa).filter(Pessoa.cpf == obj_in.cpf).first()
        if existing:
            raise HTTPException(status_code=400, detail="CPF já cadastrado")

    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    
    obj.updated_at = datetime.utcnow()
        
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade ou duplicidade")
    return obj

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_pessoa(
    id: int,
    db: Session = Depends(get_db)
):
    obj = db.query(Pessoa).filter(Pessoa.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None