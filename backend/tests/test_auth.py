from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario

client = TestClient(app)

SENHA_TESTE = "senhaDeTeste123"


@pytest.fixture
def usuario_ativo():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário de Teste Auth",
        created_at=agora,
        updated_at=agora,
    )
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="teste.auth@example.com",
        senha_hash=hash_password(SENHA_TESTE),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    yield usuario.email

    db.delete(usuario)
    db.delete(pessoa)
    db.commit()
    db.close()


@pytest.fixture
def usuario_dominio_local():
    # Regressão: o e-mail institucional usa o domínio interno "acpb.local" (não roteável
    # publicamente). EmailStr rejeita domínios de uso especial (RFC 6761) como ".local" — por
    # isso o login usa validação de formato simples, não EmailStr (ver schemas/auth.py).
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário Domínio Local de Teste",
        created_at=agora,
        updated_at=agora,
    )
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="teste.dominio.local@acpb.local",
        senha_hash=hash_password(SENHA_TESTE),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    yield usuario.email

    db.delete(usuario)
    db.delete(pessoa)
    db.commit()
    db.close()


@pytest.fixture
def usuario_inativo():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário Inativo de Teste",
        created_at=agora,
        updated_at=agora,
    )
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="inativo.auth@example.com",
        senha_hash=hash_password(SENHA_TESTE),
        ativo=False,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    yield usuario.email

    db.delete(usuario)
    db.delete(pessoa)
    db.commit()
    db.close()


def test_login_com_credenciais_validas_retorna_token(usuario_ativo):
    response = client.post(
        "/auth/login", json={"email": usuario_ativo, "senha": SENHA_TESTE}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_com_senha_incorreta_e_recusado(usuario_ativo):
    response = client.post(
        "/auth/login", json={"email": usuario_ativo, "senha": "senhaErrada"}
    )
    assert response.status_code == 401


def test_login_com_email_inexistente_e_recusado():
    response = client.post(
        "/auth/login",
        json={"email": "nao.existe@example.com", "senha": "qualquercoisa"},
    )
    assert response.status_code == 401


def test_login_com_email_de_dominio_local_funciona(usuario_dominio_local):
    response = client.post(
        "/auth/login", json={"email": usuario_dominio_local, "senha": SENHA_TESTE}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_me_retorna_dados_e_permissoes_do_usuario_autenticado(usuario_ativo):
    login = client.post(
        "/auth/login", json={"email": usuario_ativo, "senha": SENHA_TESTE}
    )
    token = login.json()["access_token"]

    resposta = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resposta.status_code == 200
    body = resposta.json()
    assert body["email"] == usuario_ativo
    assert body["perfis"] == []
    assert body["permissoes"] == []


def test_me_sem_token_retorna_401():
    resposta = client.get("/auth/me")
    assert resposta.status_code == 401


def test_login_de_usuario_inativo_e_recusado(usuario_inativo):
    response = client.post(
        "/auth/login", json={"email": usuario_inativo, "senha": SENHA_TESTE}
    )
    assert response.status_code == 401
