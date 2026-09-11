import app.models  # noqa: F401 - garante o registro de todos os models
from app.db.base import Base

TABELAS_ESPERADAS = {
    "pessoas",
    "telefones",
    "cargos",
    "membros",
    "voluntarios",
    "beneficiarios",
    "atendimentos",
    "usuarios",
    "perfis",
    "permissoes",
    "perfil_permissoes",
    "usuario_perfis",
    "projetos",
    "eventos",
    "inscricoes",
    "projeto_voluntarios",
    "contas_financeiras",
    "categorias_financeiras",
    "movimentacoes_financeiras",
    "auditoria",
}


def test_todas_as_tabelas_estao_registradas():
    assert TABELAS_ESPERADAS.issubset(set(Base.metadata.tables.keys()))
