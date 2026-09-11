from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.db.session import get_db
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if dados.get("responsavel_id") is not None and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")

@router.get("/", response_model=list[ProjetoResponse], dependencies=[Depends(require_permission("projetos.visualizar"))])
def listar_projetos(db: Session = Depends(get_db)):
    return db.query(Projeto).all()

@router.get("/{id}", response_model=ProjetoResponse, dependencies=[Depends(require_permission("projetos.visualizar"))])
def obter_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    return obj

@router.post("/", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("projetos.criar"))])
def criar_projeto(obj_in: ProjetoCreate, db: Session = Depends(get_db)):
    _validar_referencias(db, obj_in.model_dump())
    agora = datetime.utcnow()
    obj = Projeto(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=ProjetoResponse, dependencies=[Depends(require_permission("projetos.editar"))])
def atualizar_projeto(id: int, obj_in: ProjetoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("projetos.editar"))])
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
