import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.categoria_financeira import CategoriaFinanceira
from app.schemas.categoria_financeira import CategoriaFinanceiraCreate, CategoriaFinanceiraUpdate, CategoriaFinanceiraResponse

router = APIRouter()


def _chave_do_nome(nome: str) -> str:
    """"Aluguel", "aluguel" e "ALUGUÉL " viram a mesma chave."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFKD", nome) if not unicodedata.combining(c)
    )
    return " ".join(sem_acento.casefold().split())


def _recusar_nome_repetido(db: Session, nome: str, tipo: str, ignorar_id: int | None = None) -> None:
    """Categoria repetida do mesmo tipo, mudando só maiúsculas ou acentos (RQ-12).

    O banco já recusa o nome idêntico; "aluguel" ao lado de "Aluguel" passava. A tabela tem
    dezenas de linhas, então comparar em Python custa nada e evita depender de extensão
    (unaccent) no Postgres.
    """
    chave = _chave_do_nome(nome)
    for existente in db.query(CategoriaFinanceira).all():
        if existente.id == ignorar_id or existente.tipo.upper() != tipo.upper():
            continue
        if _chave_do_nome(existente.nome) == chave:
            raise HTTPException(
                status_code=409,
                detail=f'Já existe a categoria "{existente.nome}" desse tipo',
            )


@router.get("/", response_model=list[CategoriaFinanceiraResponse], dependencies=[Depends(require_permission("financeiro.visualizar"))])
def listar_categorias_financeiras(db: Session = Depends(get_db)):
    return db.query(CategoriaFinanceira).all()

@router.get("/{id}", response_model=CategoriaFinanceiraResponse, dependencies=[Depends(require_permission("financeiro.visualizar"))])
def obter_categoria_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="CategoriaFinanceira não encontrado(a)")
    return obj

@router.post("/", response_model=CategoriaFinanceiraResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("financeiro.criar"))])
def criar_categoria_financeira(obj_in: CategoriaFinanceiraCreate, db: Session = Depends(get_db)):
    _recusar_nome_repetido(db, obj_in.nome, obj_in.tipo)
    agora = datetime.utcnow()
    obj = CategoriaFinanceira(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=CategoriaFinanceiraResponse, dependencies=[Depends(require_permission("financeiro.editar"))])
def atualizar_categoria_financeira(id: int, obj_in: CategoriaFinanceiraUpdate, db: Session = Depends(get_db)):
    obj = db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="CategoriaFinanceira não encontrado(a)")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    if "nome" in update_data or "tipo" in update_data:
        _recusar_nome_repetido(
            db,
            update_data.get("nome") or obj.nome,
            update_data.get("tipo") or obj.tipo,
            ignorar_id=obj.id,
        )
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("financeiro.editar"))])
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
