from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Dashboard Fin Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="dashboardfin.admin@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()

    token = create_access_token(subject=str(usuario.id))

    yield token

    db.query(Auditoria).filter(Auditoria.usuario_id == usuario.id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


@pytest.fixture
def token_voluntario():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Voluntario Dashboard Fin Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="dashboardfin.voluntario@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Voluntário").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()

    token = create_access_token(subject=str(usuario.id))

    yield token

    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_resumo_periodo_com_filtro_de_datas(token_admin):
    response = client.get(
        "/dashboard/financeiro/resumo-periodo",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"data_inicio": "2000-01-01", "data_fim": "2100-01-01"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "receitas" in body and "despesas" in body and "saldo" in body
    assert body["saldo"] == body["receitas"] - body["despesas"]


def test_por_categoria_retorna_lista(token_admin):
    response = client.get(
        "/dashboard/financeiro/por-categoria",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_evolucao_mensal_retorna_lista_ordenada(token_admin):
    response = client.get(
        "/dashboard/financeiro/evolucao", headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert response.status_code == 200
    dados = response.json()
    chaves = [(d["ano"], d["mes"]) for d in dados]
    assert chaves == sorted(chaves)


def test_despesas_por_projeto_retorna_lista(token_admin):
    response = client.get(
        "/dashboard/financeiro/despesas-por-projeto",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_voluntario_nao_acessa_dados_financeiros_do_dashboard(token_voluntario):
    response = client.get(
        "/dashboard/financeiro/resumo-periodo",
        headers={"Authorization": f"Bearer {token_voluntario}"},
    )
    assert response.status_code == 403


def test_resumo_geral_continua_publico_para_qualquer_autenticado(token_voluntario):
    response = client.get(
        "/dashboard/resumo", headers={"Authorization": f"Bearer {token_voluntario}"}
    )
    assert response.status_code == 200
