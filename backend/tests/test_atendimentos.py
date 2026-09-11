from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.atendimento import Atendimento
from app.models.auditoria import Auditoria
from app.models.beneficiario import Beneficiario
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Atendimentos Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="atendimentos.admin@example.com",
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

    yield token, usuario.pessoa_id

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
    pessoa = Pessoa(nome_completo="Voluntario Atendimentos Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="atendimentos.voluntario@example.com",
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


@pytest.fixture
def beneficiario_teste():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Beneficiario para Atendimento", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    beneficiario = Beneficiario(
        pessoa_id=pessoa.id, data_cadastro="2026-01-01", created_at=agora, updated_at=agora
    )
    db.add(beneficiario)
    db.commit()
    db.refresh(beneficiario)

    yield beneficiario.id

    db.query(Atendimento).filter(Atendimento.beneficiario_id == beneficiario.id).delete()
    db.query(Beneficiario).filter(Beneficiario.id == beneficiario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_admin_cria_e_lista_atendimento(token_admin, beneficiario_teste):
    token, responsavel_pessoa_id = token_admin
    headers = {"Authorization": f"Bearer {token}"}

    criar = client.post(
        "/atendimentos/",
        headers=headers,
        json={
            "beneficiario_id": beneficiario_teste,
            "responsavel_id": responsavel_pessoa_id,
            "data_atendimento": "2026-01-15",
            "tipo": "Visita",
            "descricao": "Primeira visita",
        },
    )
    assert criar.status_code == 201

    listar = client.get(
        "/atendimentos/", headers=headers, params={"beneficiario_id": beneficiario_teste}
    )
    assert listar.status_code == 200
    assert len(listar.json()) == 1


def test_voluntario_sem_acesso_a_beneficiarios_nao_acessa_atendimentos(
    token_voluntario, beneficiario_teste
):
    response = client.get(
        "/atendimentos/",
        headers={"Authorization": f"Bearer {token_voluntario}"},
        params={"beneficiario_id": beneficiario_teste},
    )
    assert response.status_code == 403


def test_criar_atendimento_com_beneficiario_inexistente_retorna_404(token_admin):
    token, responsavel_pessoa_id = token_admin
    response = client.post(
        "/atendimentos/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "beneficiario_id": 999999999,
            "responsavel_id": responsavel_pessoa_id,
            "data_atendimento": "2026-01-15",
        },
    )
    assert response.status_code == 404
