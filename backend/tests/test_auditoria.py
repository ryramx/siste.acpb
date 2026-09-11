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


def _criar_usuario_com_perfil(db, email: str, nome_perfil: str) -> Usuario:
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo=f"Teste Auditoria {nome_perfil}", created_at=agora, updated_at=agora)
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


def _limpar(db, usuario_id, pessoa_id):
    db.query(Auditoria).filter(Auditoria.usuario_id == usuario_id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario_id).delete()
    db.query(Usuario).filter(Usuario.id == usuario_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()


@pytest.fixture
def token_admin():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "auditoria.admin@example.com", "Administrador")
    token = create_access_token(subject=str(usuario.id))
    yield token, usuario.id
    _limpar(db, usuario.id, usuario.pessoa_id)
    db.close()


@pytest.fixture
def token_voluntario():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "auditoria.voluntario@example.com", "Voluntário")
    token = create_access_token(subject=str(usuario.id))
    yield token
    _limpar(db, usuario.id, usuario.pessoa_id)
    db.close()


def test_criar_perfil_gera_evento_de_auditoria(token_admin):
    token, usuario_id = token_admin
    headers = {"Authorization": f"Bearer {token}"}

    criar = client.post(
        "/perfis/",
        headers=headers,
        json={"nome": "Perfil Teste Auditoria", "descricao": "temp", "ativo": True},
    )
    assert criar.status_code == 201
    perfil_id = criar.json()["id"]

    db = SessionLocal()
    evento = (
        db.query(Auditoria)
        .filter(Auditoria.tabela == "perfis", Auditoria.registro_id == perfil_id)
        .first()
    )
    assert evento is not None
    assert evento.acao == "criar"
    assert evento.usuario_id == usuario_id
    assert evento.dados_novos["nome"] == "Perfil Teste Auditoria"

    # limpeza
    db.query(Auditoria).filter(Auditoria.id == evento.id).delete()
    from app.models.perfil import Perfil

    db.query(Perfil).filter(Perfil.id == perfil_id).delete()
    db.commit()
    db.close()


def test_apenas_admin_consulta_auditoria(token_admin, token_voluntario):
    token, _ = token_admin

    resposta_admin = client.get(
        "/auditoria/", headers={"Authorization": f"Bearer {token}"}
    )
    assert resposta_admin.status_code == 200

    resposta_voluntario = client.get(
        "/auditoria/", headers={"Authorization": f"Bearer {token_voluntario}"}
    )
    assert resposta_voluntario.status_code == 403


def test_auditoria_filtra_por_tabela(token_admin):
    token, _ = token_admin
    response = client.get(
        "/auditoria/",
        headers={"Authorization": f"Bearer {token}"},
        params={"tabela": "perfis"},
    )
    assert response.status_code == 200
    for evento in response.json():
        assert evento["tabela"] == "perfis"
