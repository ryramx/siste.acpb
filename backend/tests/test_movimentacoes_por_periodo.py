"""Filtro por ano e mês nas movimentações (RQ-07 da rodada de QA de 25/09/2026)."""

from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.movimentacao_financeira import MovimentacaoFinanceira
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)
PREFIXO = "Periodo Teste"


@pytest.fixture
def cenario():
    """Um admin e três lançamentos: dez/2025, jan/2026 e set/2026."""
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Periodo Teste", created_at=agora, updated_at=agora)
    conta = ContaFinanceira(
        nome=f"{PREFIXO} Conta", tipo="corrente", saldo_inicial=0, ativo=True,
        created_at=agora, updated_at=agora,
    )
    categoria = CategoriaFinanceira(
        nome=f"{PREFIXO} Categoria", tipo="SAIDA", ativo=True, created_at=agora, updated_at=agora
    )
    db.add_all([pessoa, conta, categoria])
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id, email="periodo.admin@example.com",
        senha_hash=hash_password("qualquerSenha123"), ativo=True,
        created_at=agora, updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    for descricao, dia in (
        ("dez25", date(2025, 12, 31)),
        ("jan26", date(2026, 1, 1)),
        ("set26", date(2026, 9, 25)),
    ):
        db.add(MovimentacaoFinanceira(
            conta_financeira_id=conta.id, categoria_id=categoria.id, responsavel_id=pessoa.id,
            tipo="SAIDA", descricao=f"{PREFIXO} {descricao}", valor=10, data_movimentacao=dia,
            status="CONFIRMADA", created_at=agora, updated_at=agora,
        ))
    db.commit()

    yield {"Authorization": f"Bearer {create_access_token(subject=str(usuario.id))}"}

    db.query(MovimentacaoFinanceira).filter(
        MovimentacaoFinanceira.descricao.like(f"{PREFIXO}%")
    ).delete(synchronize_session=False)
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(ContaFinanceira).filter(ContaFinanceira.id == conta.id).delete()
    db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == categoria.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def _descricoes(headers, **params) -> list[str]:
    resposta = client.get("/movimentacoes-financeiras/", headers=headers, params=params)
    assert resposta.status_code == 200
    return [m["descricao"] for m in resposta.json() if m["descricao"].startswith(PREFIXO)]


def test_sem_periodo_vem_tudo_do_mais_recente_ao_mais_antigo(cenario):
    assert _descricoes(cenario) == [f"{PREFIXO} set26", f"{PREFIXO} jan26", f"{PREFIXO} dez25"]


def test_ano_deixa_de_fora_os_outros_anos(cenario):
    assert _descricoes(cenario, ano=2026) == [f"{PREFIXO} set26", f"{PREFIXO} jan26"]
    assert _descricoes(cenario, ano=2025) == [f"{PREFIXO} dez25"]


def test_mes_dentro_do_ano(cenario):
    assert _descricoes(cenario, ano=2026, mes=1) == [f"{PREFIXO} jan26"]
    assert _descricoes(cenario, ano=2025, mes=12) == [f"{PREFIXO} dez25"]
    assert _descricoes(cenario, ano=2026, mes=2) == []


def test_mes_sem_ano_e_recusado(cenario):
    resposta = client.get("/movimentacoes-financeiras/", headers=cenario, params={"mes": 3})
    assert resposta.status_code == 422


def test_anos_lista_os_que_tem_lancamento_e_o_atual(cenario):
    resposta = client.get("/movimentacoes-financeiras/anos", headers=cenario)
    assert resposta.status_code == 200
    anos = resposta.json()
    assert {2025, 2026, date.today().year} <= set(anos)
    assert anos == sorted(anos, reverse=True)
