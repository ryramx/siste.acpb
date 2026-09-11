from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.pessoa import Pessoa
from app.models.perfil import Perfil
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


def _criar_usuario_com_perfil(db, email: str, nome_perfil: str) -> Usuario:
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo=f"Teste Usuarios {nome_perfil}", created_at=agora, updated_at=agora)
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
    # Eventos de auditoria referenciam o usuário-ator via FK (NO ACTION) — precisam ser
    # removidos antes do usuário de teste, senão a exclusão é bloqueada (comportamento
    # correto para produção: preserva histórico mesmo se o ator for removido).
    db.query(Auditoria).filter(Auditoria.usuario_id == usuario_id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario_id).delete()
    db.query(Usuario).filter(Usuario.id == usuario_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()


@pytest.fixture
def token_admin():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "usuarios.admin@example.com", "Administrador")
    token = create_access_token(subject=str(usuario.id))
    yield token
    _limpar(db, usuario.id, usuario.pessoa_id)
    db.close()


@pytest.fixture
def token_voluntario():
    db = SessionLocal()
    usuario = _criar_usuario_com_perfil(db, "usuarios.voluntario@example.com", "Voluntário")
    token = create_access_token(subject=str(usuario.id))
    yield token
    _limpar(db, usuario.id, usuario.pessoa_id)
    db.close()


def test_admin_cria_lista_e_desativa_usuario(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa para Novo Usuário", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)

    headers = {"Authorization": f"Bearer {token_admin}"}

    criar = client.post(
        "/usuarios/",
        headers=headers,
        json={
            "pessoa_id": pessoa.id,
            "email": "novo.usuario.teste@example.com",
            "senha": "senhaForte123",
        },
    )
    assert criar.status_code == 201
    body = criar.json()
    assert "senha_hash" not in body
    assert "senha" not in body
    usuario_id = body["id"]

    listar = client.get("/usuarios/", headers=headers)
    assert listar.status_code == 200

    desativar = client.post(f"/usuarios/{usuario_id}/desativar", headers=headers)
    assert desativar.status_code == 200
    assert desativar.json()["ativo"] is False

    db.query(Usuario).filter(Usuario.id == usuario_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_voluntario_nao_administra_usuarios(token_voluntario):
    response = client.get(
        "/usuarios/", headers={"Authorization": f"Bearer {token_voluntario}"}
    )
    assert response.status_code == 403
