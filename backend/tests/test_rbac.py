from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.perfil import Perfil
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


def _criar_usuario_com_perfil(db, email: str, nome_perfil: str) -> Usuario:
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo=f"Teste RBAC {nome_perfil}", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email=email,
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()

    perfil = db.query(Perfil).filter(Perfil.nome == nome_perfil).first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()
    return usuario


@pytest.fixture
def usuario_administrador():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "rbac.admin@example.com", "Administrador")
    token = create_access_token(subject=str(usuario.id))
    yield token
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == usuario.pessoa_id).delete()
    db.commit()
    db.close()


@pytest.fixture
def usuario_voluntario():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "rbac.voluntario@example.com", "Voluntário")
    token = create_access_token(subject=str(usuario.id))
    yield token
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == usuario.pessoa_id).delete()
    db.commit()
    db.close()


def test_administrador_acessa_rota_de_pessoas(usuario_administrador):
    response = client.get(
        "/pessoas/", headers={"Authorization": f"Bearer {usuario_administrador}"}
    )
    assert response.status_code == 200


def test_voluntario_nao_acessa_pessoas(usuario_voluntario):
    response = client.get(
        "/pessoas/", headers={"Authorization": f"Bearer {usuario_voluntario}"}
    )
    assert response.status_code == 403


def test_voluntario_acessa_eventos_apenas_leitura(usuario_voluntario):
    listar = client.get(
        "/eventos/", headers={"Authorization": f"Bearer {usuario_voluntario}"}
    )
    assert listar.status_code == 200

    criar = client.post(
        "/eventos/",
        headers={"Authorization": f"Bearer {usuario_voluntario}"},
        json={"nome": "Evento Teste", "data_evento": "2026-01-01", "exige_inscricao": False},
    )
    assert criar.status_code == 403


def test_voluntario_nao_acessa_financeiro(usuario_voluntario):
    response = client.get(
        "/movimentacoes-financeiras/", headers={"Authorization": f"Bearer {usuario_voluntario}"}
    )
    assert response.status_code == 403
