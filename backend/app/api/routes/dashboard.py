from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.api.deps import get_current_user, get_permissoes_usuario, require_permission
from app.db.session import get_db
from app.models.pessoa import Pessoa
from app.models.membro import Membro
from app.models.voluntario import Voluntario
from app.models.beneficiario import Beneficiario
from app.models.projeto import Projeto
from app.models.evento import Evento
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.usuario import Usuario
from app.schemas.dashboard import (
    CategoriaResumoResponse,
    DashboardResumoResponse,
    DespesaPorProjetoResponse,
    EvolucaoMensalResponse,
    ResumoPeriodoResponse,
)

router = APIRouter()

_financeiro = [Depends(require_permission("financeiro.visualizar"))]


def _filtro_periodo(query, data_inicio: date | None, data_fim: date | None):
    if data_inicio is not None:
        query = query.filter(MovimentacaoFinanceira.data_movimentacao >= data_inicio)
    if data_fim is not None:
        query = query.filter(MovimentacaoFinanceira.data_movimentacao <= data_fim)
    return query

@router.get("/resumo", response_model=DashboardResumoResponse, response_model_exclude_none=True)
def obter_resumo(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    qtd_pessoas = db.query(func.count(Pessoa.id)).scalar() or 0
    membros_ativos = db.query(func.count(Membro.id)).filter(Membro.ativo == True).scalar() or 0
    voluntarios_ativos = db.query(func.count(Voluntario.id)).filter(Voluntario.data_fim == None).scalar() or 0
    beneficiarios = db.query(func.count(Beneficiario.id)).scalar() or 0

    projetos_ativos = db.query(func.count(Projeto.id)).filter(
        func.upper(Projeto.status).in_(['ATIVO', 'PLANEJADO'])
    ).scalar() or 0
    proximos_eventos = db.query(func.count(Evento.id)).filter(Evento.data_evento >= datetime.now().date()).scalar() or 0

    resumo = {
        "quantidade_pessoas": qtd_pessoas,
        "membros_ativos": membros_ativos,
        "voluntarios_ativos": voluntarios_ativos,
        "beneficiarios": beneficiarios,
        "projetos_ativos": projetos_ativos,
        "proximos_eventos": proximos_eventos,
    }

    # Indicadores financeiros exigem financeiro.visualizar (ver RBAC.md) — omitidos da
    # resposta (não zerados) para quem não tem a permissão, em vez de bloquear o dashboard
    # geral inteiro com 403.
    if "financeiro.visualizar" in get_permissoes_usuario(usuario_atual, db):
        receitas = db.query(func.sum(MovimentacaoFinanceira.valor)).filter(
            func.upper(MovimentacaoFinanceira.tipo) == 'ENTRADA',
            func.upper(MovimentacaoFinanceira.status) == 'CONFIRMADA'
        ).scalar() or 0.0

        despesas = db.query(func.sum(MovimentacaoFinanceira.valor)).filter(
            func.upper(MovimentacaoFinanceira.tipo) == 'SAIDA',
            func.upper(MovimentacaoFinanceira.status) == 'CONFIRMADA'
        ).scalar() or 0.0

        saldo_inicial = db.query(func.sum(ContaFinanceira.saldo_inicial)).scalar() or 0.0

        resumo["saldo_financeiro"] = float(saldo_inicial) + float(receitas) - float(despesas)
        resumo["receitas_confirmadas"] = float(receitas)
        resumo["despesas_confirmadas"] = float(despesas)

    return resumo


@router.get(
    "/financeiro/resumo-periodo", response_model=ResumoPeriodoResponse, dependencies=_financeiro
)
def resumo_financeiro_periodo(
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    base = _filtro_periodo(
        db.query(func.upper(MovimentacaoFinanceira.tipo), func.sum(MovimentacaoFinanceira.valor))
        .filter(func.upper(MovimentacaoFinanceira.status) == "CONFIRMADA")
        .group_by(func.upper(MovimentacaoFinanceira.tipo)),
        data_inicio,
        data_fim,
    ).all()

    totais = {tipo: float(total) for tipo, total in base}
    receitas = totais.get("ENTRADA", 0.0)
    despesas = totais.get("SAIDA", 0.0)

    return ResumoPeriodoResponse(
        data_inicio=data_inicio,
        data_fim=data_fim,
        receitas=receitas,
        despesas=despesas,
        saldo=receitas - despesas,
    )


@router.get(
    "/financeiro/por-categoria",
    response_model=list[CategoriaResumoResponse],
    dependencies=_financeiro,
)
def financeiro_por_categoria(
    data_inicio: date | None = None,
    data_fim: date | None = None,
    tipo: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            CategoriaFinanceira.id,
            CategoriaFinanceira.nome,
            func.upper(MovimentacaoFinanceira.tipo),
            func.sum(MovimentacaoFinanceira.valor),
        )
        .join(
            MovimentacaoFinanceira,
            MovimentacaoFinanceira.categoria_id == CategoriaFinanceira.id,
        )
        .filter(func.upper(MovimentacaoFinanceira.status) == "CONFIRMADA")
        .group_by(CategoriaFinanceira.id, CategoriaFinanceira.nome, func.upper(MovimentacaoFinanceira.tipo))
    )
    if tipo is not None:
        query = query.filter(func.upper(MovimentacaoFinanceira.tipo) == tipo.upper())
    query = _filtro_periodo(query, data_inicio, data_fim)

    return [
        CategoriaResumoResponse(
            categoria_id=categoria_id,
            categoria_nome=categoria_nome,
            tipo=tipo_mov,
            total=float(total),
        )
        for categoria_id, categoria_nome, tipo_mov, total in query.all()
    ]


@router.get(
    "/financeiro/evolucao", response_model=list[EvolucaoMensalResponse], dependencies=_financeiro
)
def financeiro_evolucao_mensal(
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    ano = extract("year", MovimentacaoFinanceira.data_movimentacao)
    mes = extract("month", MovimentacaoFinanceira.data_movimentacao)

    query = (
        db.query(ano, mes, func.upper(MovimentacaoFinanceira.tipo), func.sum(MovimentacaoFinanceira.valor))
        .filter(func.upper(MovimentacaoFinanceira.status) == "CONFIRMADA")
        .group_by(ano, mes, func.upper(MovimentacaoFinanceira.tipo))
        .order_by(ano, mes)
    )
    query = _filtro_periodo(query, data_inicio, data_fim)

    agregados: dict[tuple[int, int], dict[str, float]] = {}
    for ano_val, mes_val, tipo_mov, total in query.all():
        chave = (int(ano_val), int(mes_val))
        agregados.setdefault(chave, {"ENTRADA": 0.0, "SAIDA": 0.0})[tipo_mov] = float(total)

    return [
        EvolucaoMensalResponse(
            ano=ano_val, mes=mes_val, receitas=valores["ENTRADA"], despesas=valores["SAIDA"]
        )
        for (ano_val, mes_val), valores in sorted(agregados.items())
    ]


@router.get(
    "/financeiro/despesas-por-projeto",
    response_model=list[DespesaPorProjetoResponse],
    dependencies=_financeiro,
)
def financeiro_despesas_por_projeto(
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Projeto.id, Projeto.nome, func.sum(MovimentacaoFinanceira.valor))
        .join(Projeto, Projeto.id == MovimentacaoFinanceira.projeto_id)
        .filter(
            func.upper(MovimentacaoFinanceira.tipo) == "SAIDA",
            func.upper(MovimentacaoFinanceira.status) == "CONFIRMADA",
        )
        .group_by(Projeto.id, Projeto.nome)
        .order_by(func.sum(MovimentacaoFinanceira.valor).desc())
    )
    query = _filtro_periodo(query, data_inicio, data_fim)

    return [
        DespesaPorProjetoResponse(projeto_id=pid, projeto_nome=nome, total_despesas=float(total))
        for pid, nome, total in query.all()
    ]
