from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.beneficiario import Beneficiario
from app.models.cargo import Cargo
from app.models.membro import Membro
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.models.voluntario import Voluntario

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Cadastro Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="cadastro.admin@example.com",
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


def test_cadastra_pessoa_nova_e_vincula_como_voluntario(token_admin):
    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa": {"nome_completo": "Fulano de Tal Voluntario"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-01"},
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["papel_criado"] == "voluntario"
    assert body["voluntario"] is not None
    assert body["papeis"]["tem_voluntario"] is True
    assert body["papeis"]["tem_membro"] is False

    pessoa_id = body["pessoa"]["id"]
    db = SessionLocal()
    db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_reaproveita_pessoa_existente_para_novo_papel(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa com Múltiplos Papéis", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    pessoa_id = pessoa.id
    db.close()

    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_id,
            "papel": "beneficiario",
            "beneficiario": {"data_cadastro": "2026-01-01"},
        },
    )
    assert response.status_code == 201
    assert response.json()["pessoa"]["id"] == pessoa_id

    papeis = client.get(
        f"/cadastros/pessoa/{pessoa_id}/papeis",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert papeis.status_code == 200
    assert papeis.json()["tem_beneficiario"] is True

    db = SessionLocal()
    db.query(Beneficiario).filter(Beneficiario.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_papel_duplicado_para_mesma_pessoa_e_rejeitado(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    cargo = Cargo(nome="Cargo Duplicado Teste", ativo=True, created_at=agora, updated_at=agora)
    db.add(cargo)
    db.flush()
    pessoa = Pessoa(nome_completo="Pessoa Membro Duplicado", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    cargo_id = cargo.id
    membro = Membro(
        pessoa_id=pessoa.id,
        cargo_id=cargo_id,
        data_entrada="2026-01-01",
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(membro)
    db.commit()
    pessoa_id = pessoa.id
    db.close()

    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_id,
            "papel": "membro",
            "membro": {"cargo_id": cargo_id, "data_entrada": "2026-02-01", "ativo": True},
        },
    )
    assert response.status_code == 409

    db = SessionLocal()
    db.query(Membro).filter(Membro.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.query(Cargo).filter(Cargo.id == cargo_id).delete()
    db.commit()
    db.close()


def test_requer_ambos_pessoa_id_e_pessoa_como_erro(token_admin):
    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": 1,
            "pessoa": {"nome_completo": "Não devia funcionar"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-01"},
        },
    )
    assert response.status_code == 422
