from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.routes.health import get_db
from app.models.pessoa import Pessoa
from app.models.membro import Membro
from app.models.voluntario import Voluntario
from app.models.beneficiario import Beneficiario
from app.models.projeto import Projeto
from app.models.evento import Evento
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.schemas.dashboard import DashboardResumoResponse
from datetime import datetime

router = APIRouter()

@router.get("/resumo", response_model=DashboardResumoResponse)
def obter_resumo(db: Session = Depends(get_db)):
    qtd_pessoas = db.query(func.count(Pessoa.id)).scalar() or 0
    membros_ativos = db.query(func.count(Membro.id)).filter(Membro.ativo == True).scalar() or 0
    voluntarios_ativos = db.query(func.count(Voluntario.id)).filter(Voluntario.data_fim == None).scalar() or 0
    beneficiarios = db.query(func.count(Beneficiario.id)).scalar() or 0
    
    projetos_ativos = db.query(func.count(Projeto.id)).filter(
        func.upper(Projeto.status).in_(['ATIVO', 'PLANEJADO'])
    ).scalar() or 0
    proximos_eventos = db.query(func.count(Evento.id)).filter(Evento.data_evento >= datetime.now().date()).scalar() or 0
    
    receitas = db.query(func.sum(MovimentacaoFinanceira.valor)).filter(
        func.upper(MovimentacaoFinanceira.tipo) == 'ENTRADA',
        func.upper(MovimentacaoFinanceira.status) == 'CONFIRMADA'
    ).scalar() or 0.0
    
    despesas = db.query(func.sum(MovimentacaoFinanceira.valor)).filter(
        func.upper(MovimentacaoFinanceira.tipo) == 'SAIDA',
        func.upper(MovimentacaoFinanceira.status) == 'CONFIRMADA'
    ).scalar() or 0.0

    saldo_inicial = db.query(func.sum(ContaFinanceira.saldo_inicial)).scalar() or 0.0
    
    return {
        "quantidade_pessoas": qtd_pessoas,
        "membros_ativos": membros_ativos,
        "voluntarios_ativos": voluntarios_ativos,
        "beneficiarios": beneficiarios,
        "projetos_ativos": projetos_ativos,
        "proximos_eventos": proximos_eventos,
        "saldo_financeiro": float(saldo_inicial) + float(receitas) - float(despesas),
        "receitas_confirmadas": float(receitas),
        "despesas_confirmadas": float(despesas)
    }
