"""Regressão: todas as rotas de domínio devem conseguir criar um registro com sucesso
(POST retornando 2xx), não só recusar referências inválidas. Um bug real foi encontrado
durante a integração do frontend (tarefa 28/29): a maioria dos CRUDs não preenchia
created_at/updated_at ao inserir, o que só se manifestava em uma criação bem-sucedida —
os testes de validação de FK (tests/test_validacao_referencias.py) nunca chegavam a essa
linha de código porque paravam no 404."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.beneficiario import Beneficiario
from app.models.cargo import Cargo
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
    pessoa = Pessoa(nome_completo="Admin Timestamps Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="timestamps.admin@example.com",
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
def pessoa_avulsa():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa Avulsa Timestamps", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    yield pessoa.id
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_criar_cargo_com_sucesso(token_admin):
    response = client.post(
        "/cargos/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"nome": "Cargo Teste Timestamps", "ativo": True},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["created_at"] is not None
    assert body["updated_at"] is not None

    db = SessionLocal()
    db.query(Cargo).filter(Cargo.id == body["id"]).delete()
    db.commit()
    db.close()


def test_criar_voluntario_com_sucesso(token_admin, pessoa_avulsa):
    response = client.post(
        "/voluntarios/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"pessoa_id": pessoa_avulsa, "data_inicio": "2026-01-01"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["created_at"] is not None

    db = SessionLocal()
    db.query(Voluntario).filter(Voluntario.id == body["id"]).delete()
    db.commit()
    db.close()


def test_criar_beneficiario_com_sucesso(token_admin, pessoa_avulsa):
    response = client.post(
        "/beneficiarios/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"pessoa_id": pessoa_avulsa, "data_cadastro": "2026-01-01"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["created_at"] is not None

    db = SessionLocal()
    db.query(Beneficiario).filter(Beneficiario.id == body["id"]).delete()
    db.commit()
    db.close()
