from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import extract
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.erros import tratar_integrity_error

from app.api.deps import get_current_user, require_permission
from app.api.routes.health import get_db
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.anexo_financeiro import AnexoFinanceiro
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

def _intervalo_do_periodo(ano: int, mes: int | None) -> tuple[date, date]:
    """[início, fim) do ano inteiro ou de um mês dele."""
    if mes is None:
        return date(ano, 1, 1), date(ano + 1, 1, 1)
    fim = date(ano + 1, 1, 1) if mes == 12 else date(ano, mes + 1, 1)
    return date(ano, mes, 1), fim


@router.get("/", response_model=list[MovimentacaoFinanceiraResponse], dependencies=[Depends(require_permission("financeiro.visualizar"))])
def listar_movimentacoes_financeiras(
    ano: int | None = Query(None, ge=1900, le=2999),
    mes: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Lançamentos, do mais recente ao mais antigo.

    `ano` (e opcionalmente `mes`) limita ao período (RQ-07 da rodada de QA de 25/09/2026):
    com os anos, tudo junto numa tela só fazia perder o controle dos gastos. Sem `ano`, vem
    tudo, como antes — o detalhe de projeto usa assim. O filtro é por intervalo de datas, e não
    por EXTRACT, para poder usar o índice da coluna.
    """
    if mes is not None and ano is None:
        raise HTTPException(status_code=422, detail="Informe o ano junto com o mês")
    consulta = db.query(MovimentacaoFinanceira)
    if ano is not None:
        inicio, fim = _intervalo_do_periodo(ano, mes)
        consulta = consulta.filter(
            MovimentacaoFinanceira.data_movimentacao >= inicio,
            MovimentacaoFinanceira.data_movimentacao < fim,
        )
    return consulta.order_by(
        MovimentacaoFinanceira.data_movimentacao.desc(), MovimentacaoFinanceira.id.desc()
    ).all()


@router.get("/anos", response_model=list[int], dependencies=[Depends(require_permission("financeiro.visualizar"))])
def listar_anos_com_movimentacao(db: Session = Depends(get_db)):
    """Anos que têm lançamento, mais o ano atual, do mais recente ao mais antigo.

    Alimenta o seletor de ano: oferecer um ano sem nada levaria a uma tela vazia.
    """
    ano_da_data = extract("year", MovimentacaoFinanceira.data_movimentacao)
    anos = {int(a) for (a,) in db.query(ano_da_data).distinct().all()}
    anos.add(date.today().year)
    return sorted(anos, reverse=True)

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

    # A chave estrangeira de `anexos_financeiros` já barraria a exclusão, mas com a mensagem
    # genérica de integridade referencial — que não diz ao usuário o que fazer. Contar os
    # anexos aqui permite nomear o motivo: o comprovante é documento contábil, e apagá-lo em
    # cascata junto com o lançamento seria destruir a prova de uma despesa por um clique de
    # correção. Quem realmente quer excluir remove os comprovantes primeiro, deliberadamente.
    anexos = (
        db.query(AnexoFinanceiro)
        .filter(AnexoFinanceiro.movimentacao_financeira_id == id)
        .count()
    )
    if anexos:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Este lançamento tem {anexos} comprovante(s) anexado(s). Remova os "
                "comprovantes antes de excluir o lançamento."
            ),
        )

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
