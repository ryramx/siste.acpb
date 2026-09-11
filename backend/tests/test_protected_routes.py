from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario

client = TestClient(app)


@pytest.fixture
def usuario_e_token():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário de Teste Rotas Protegidas",
        created_at=agora,
        updated_at=agora,
    )
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="protegido.auth@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    token = create_access_token(subject=str(usuario.id))

    yield token

    db.delete(usuario)
    db.delete(pessoa)
    db.commit()
    db.close()


def test_rota_de_negocio_sem_token_retorna_401():
    response = client.get("/pessoas/")
    assert response.status_code == 401


def test_rota_de_negocio_com_token_valido_retorna_200(usuario_e_token):
    # /dashboard/resumo não exige permissão de módulo (ver RBAC.md), só autenticação —
    # mantém este teste focado na tarefa 10 (autenticação), não na tarefa 11 (autorização).
    response = client.get(
        "/dashboard/resumo", headers={"Authorization": f"Bearer {usuario_e_token}"}
    )
    assert response.status_code == 200


def test_rota_publica_health_nao_exige_token():
    response = client.get("/health/")
    assert response.status_code == 200


def test_rota_de_negocio_com_token_invalido_retorna_401():
    response = client.get(
        "/pessoas/", headers={"Authorization": "Bearer token-invalido-qualquer"}
    )
    assert response.status_code == 401
