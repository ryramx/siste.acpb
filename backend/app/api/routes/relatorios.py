from datetime import date

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.relatorios import MIME_POR_FORMATO, FormatoRelatorio, gerar_relatorio
from app.db.session import get_db
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.evento import Evento
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto

router = APIRouter()


def _responder_arquivo(formato: FormatoRelatorio, nome_base: str, conteudo: bytes) -> Response:
    return Response(
        content=conteudo,
        media_type=MIME_POR_FORMATO[formato],
        headers={"Content-Disposition": f'attachment; filename="{nome_base}.{formato}"'},
    )


@router.get("/financeiro", dependencies=[Depends(require_permission("financeiro.visualizar"))])
def relatorio_financeiro(
    formato: FormatoRelatorio = "csv",
    data_inicio: date | None = None,
    data_fim: date | None = None,
    tipo: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            MovimentacaoFinanceira.data_movimentacao,
            MovimentacaoFinanceira.tipo,
            MovimentacaoFinanceira.descricao,
            MovimentacaoFinanceira.valor,
            MovimentacaoFinanceira.status,
            ContaFinanceira.nome.label("conta"),
            CategoriaFinanceira.nome.label("categoria"),
        )
        .join(ContaFinanceira, ContaFinanceira.id == MovimentacaoFinanceira.conta_financeira_id)
        .join(CategoriaFinanceira, CategoriaFinanceira.id == MovimentacaoFinanceira.categoria_id)
    )
    if data_inicio is not None:
        query = query.filter(MovimentacaoFinanceira.data_movimentacao >= data_inicio)
    if data_fim is not None:
        query = query.filter(MovimentacaoFinanceira.data_movimentacao <= data_fim)
    if tipo is not None:
        query = query.filter(MovimentacaoFinanceira.tipo.ilike(tipo))
    query = query.order_by(MovimentacaoFinanceira.data_movimentacao)

    colunas = ["data_movimentacao", "tipo", "descricao", "valor", "status", "conta", "categoria"]
    linhas = [dict(zip(colunas, linha)) for linha in query.all()]

    conteudo = gerar_relatorio(formato, "Relatório Financeiro", colunas, linhas)
    return _responder_arquivo(formato, "relatorio_financeiro", conteudo)


@router.get("/pessoas", dependencies=[Depends(require_permission("pessoas.visualizar"))])
def relatorio_pessoas(
    formato: FormatoRelatorio = "csv",
    cidade: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(
        Pessoa.nome_completo,
        Pessoa.cpf,
        Pessoa.email,
        Pessoa.cidade,
        Pessoa.estado,
        Pessoa.data_nascimento,
    )
    if cidade is not None:
        query = query.filter(Pessoa.cidade.ilike(cidade))
    query = query.order_by(Pessoa.nome_completo)

    colunas = ["nome_completo", "cpf", "email", "cidade", "estado", "data_nascimento"]
    linhas = [dict(zip(colunas, linha)) for linha in query.all()]

    conteudo = gerar_relatorio(formato, "Relatório de Pessoas", colunas, linhas)
    return _responder_arquivo(formato, "relatorio_pessoas", conteudo)


@router.get("/projetos", dependencies=[Depends(require_permission("projetos.visualizar"))])
def relatorio_projetos(
    formato: FormatoRelatorio = "csv",
    status_filtro: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(
        Projeto.nome,
        Projeto.status,
        Projeto.data_inicio,
        Projeto.data_fim,
        Projeto.orcamento,
        Projeto.local,
    )
    if status_filtro is not None:
        query = query.filter(Projeto.status.ilike(status_filtro))
    query = query.order_by(Projeto.nome)

    colunas = ["nome", "status", "data_inicio", "data_fim", "orcamento", "local"]
    linhas = [dict(zip(colunas, linha)) for linha in query.all()]

    conteudo = gerar_relatorio(formato, "Relatório de Projetos", colunas, linhas)
    return _responder_arquivo(formato, "relatorio_projetos", conteudo)


@router.get("/eventos", dependencies=[Depends(require_permission("eventos.visualizar"))])
def relatorio_eventos(
    formato: FormatoRelatorio = "csv",
    data_inicio: date | None = None,
    data_fim: date | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(
        Evento.nome,
        Evento.data_evento,
        Evento.local,
        Evento.limite_participantes,
        Evento.exige_inscricao,
    )
    if data_inicio is not None:
        query = query.filter(Evento.data_evento >= data_inicio)
    if data_fim is not None:
        query = query.filter(Evento.data_evento <= data_fim)
    query = query.order_by(Evento.data_evento)

    colunas = ["nome", "data_evento", "local", "limite_participantes", "exige_inscricao"]
    linhas = [dict(zip(colunas, linha)) for linha in query.all()]

    conteudo = gerar_relatorio(formato, "Relatório de Eventos", colunas, linhas)
    return _responder_arquivo(formato, "relatorio_eventos", conteudo)
