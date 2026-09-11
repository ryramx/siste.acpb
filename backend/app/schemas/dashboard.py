from datetime import date

from pydantic import BaseModel


class ResumoPeriodoResponse(BaseModel):
    data_inicio: date | None
    data_fim: date | None
    receitas: float
    despesas: float
    saldo: float


class CategoriaResumoResponse(BaseModel):
    categoria_id: int
    categoria_nome: str
    tipo: str
    total: float


class EvolucaoMensalResponse(BaseModel):
    ano: int
    mes: int
    receitas: float
    despesas: float


class DespesaPorProjetoResponse(BaseModel):
    projeto_id: int
    projeto_nome: str
    total_despesas: float


class DashboardResumoResponse(BaseModel):
    quantidade_pessoas: int
    membros_ativos: int
    voluntarios_ativos: int
    beneficiarios: int
    projetos_ativos: int
    proximos_eventos: int
    saldo_financeiro: float
    receitas_confirmadas: float
    despesas_confirmadas: float
