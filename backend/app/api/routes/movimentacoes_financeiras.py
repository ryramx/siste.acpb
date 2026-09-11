from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.erros import tratar_integrity_error

from app.api.deps import get_current_user, require_permission
from app.api.routes.health import get_db
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.models.usuario import Usuario
from app.schemas.movimentacao_financeira import MovimentacaoFinanceiraCreate, MovimentacaoFinanceiraUpdate, MovimentacaoFinanceiraResponse

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if "conta_financeira_id" in dados and not db.query(ContaFinanceira).filter(
        ContaFinanceira.id == dados["conta_financeira_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Conta financeira não encontrada")
    if "categoria_id" in dados and not db.query(CategoriaFinanceira).filter(
        CategoriaFinanceira.id == dados["categoria_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Categoria financeira não encontrada")
    if dados.get("projeto_id") is not None and not db.query(Projeto).filter(
        Projeto.id == dados["projeto_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if "responsavel_id" in dados and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")

@router.get("/", response_model=list[MovimentacaoFinanceiraResponse], dependencies=[Depends(require_permission("financeiro.visualizar"))])
def listar_movimentacoes_financeiras(db: Session = Depends(get_db)):
    return db.query(MovimentacaoFinanceira).all()

@router.get("/{id}", response_model=MovimentacaoFinanceiraResponse, dependencies=[Depends(require_permission("financeiro.visualizar"))])
def obter_movimentacao_financeira(id: int, db: Session = Depends(get_db)):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")
    return obj

@router.post("/", response_model=MovimentacaoFinanceiraResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("financeiro.criar"))])
def criar_movimentacao_financeira(
    obj_in: MovimentacaoFinanceiraCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    _validar_referencias(db, obj_in.model_dump())
    agora = datetime.utcnow()
    obj = MovimentacaoFinanceira(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="movimentacoes_financeiras",
            registro_id=obj.id,
            dados_novos=model_to_dict(obj),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=MovimentacaoFinanceiraResponse, dependencies=[Depends(require_permission("financeiro.editar"))])
def atualizar_movimentacao_financeira(
    id: int,
    obj_in: MovimentacaoFinanceiraUpdate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")

    dados_antes = model_to_dict(obj)
    update_data = obj_in.model_dump(exclude_unset=True)
    _validar_referencias(db, update_data)
    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()

    try:
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="editar",
            tabela="movimentacoes_financeiras",
            registro_id=obj.id,
            dados_anteriores=dados_antes,
            dados_novos=model_to_dict(obj),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("financeiro.editar"))])
def deletar_movimentacao_financeira(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    obj = db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="MovimentacaoFinanceira não encontrado(a)")

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="movimentacoes_financeiras",
        registro_id=obj.id,
        dados_anteriores=model_to_dict(obj),
        ip=obter_ip_cliente(request),
    )
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
