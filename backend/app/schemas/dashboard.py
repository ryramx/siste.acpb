from pydantic import BaseModel

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
