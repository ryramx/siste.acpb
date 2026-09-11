from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.telefone import Telefone
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Telefones Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="telefones.admin@example.com",
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
def pessoa_teste():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa para Telefones", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)

    yield pessoa.id

    db.query(Telefone).filter(Telefone.pessoa_id == pessoa.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_criar_telefone_com_numero_invalido_e_rejeitado(token_admin, pessoa_teste):
    response = client.post(
        "/telefones/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"pessoa_id": pessoa_teste, "numero": "123", "tipo": "celular", "principal": True},
    )
    assert response.status_code == 422


def test_criar_telefone_normaliza_numero_e_tipo(token_admin, pessoa_teste):
    response = client.post(
        "/telefones/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_teste,
            "numero": "(11) 98888-7777",
            "tipo": "celular",
            "principal": True,
            "whatsapp": True,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["numero"] == "11988887777"
    assert body["tipo"] == "CELULAR"


def test_segundo_telefone_principal_desmarca_o_primeiro(token_admin, pessoa_teste):
    headers = {"Authorization": f"Bearer {token_admin}"}

    primeiro = client.post(
        "/telefones/",
        headers=headers,
        json={"pessoa_id": pessoa_teste, "numero": "11988887777", "tipo": "celular", "principal": True},
    ).json()

    segundo = client.post(
        "/telefones/",
        headers=headers,
        json={"pessoa_id": pessoa_teste, "numero": "1133334444", "tipo": "fixo", "principal": True},
    ).json()

    primeiro_atualizado = client.get(f"/telefones/{primeiro['id']}", headers=headers).json()
    assert primeiro_atualizado["principal"] is False
    assert segundo["principal"] is True


def test_listar_telefones_filtra_por_pessoa(token_admin, pessoa_teste):
    headers = {"Authorization": f"Bearer {token_admin}"}
    client.post(
        "/telefones/",
        headers=headers,
        json={"pessoa_id": pessoa_teste, "numero": "11977776666", "tipo": "celular"},
    )

    response = client.get("/telefones/", headers=headers, params={"pessoa_id": pessoa_teste})
    assert response.status_code == 200
    assert all(t["pessoa_id"] == pessoa_teste for t in response.json())
