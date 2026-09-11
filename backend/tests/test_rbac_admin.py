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
    pessoa = Pessoa(nome_completo="Admin RBAC Admin Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="rbac.admin.teste@example.com",
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


def test_nao_permite_desativar_perfil_administrador(token_admin):
    db = SessionLocal()
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    db.close()

    response = client.put(
        f"/perfis/{perfil_admin.id}",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"ativo": False},
    )
    assert response.status_code == 409


def test_nao_permite_remover_permissao_do_administrador(token_admin):
    db = SessionLocal()
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    from app.models.perfil_permissao import PerfilPermissao

    vinculo = (
        db.query(PerfilPermissao).filter(PerfilPermissao.perfil_id == perfil_admin.id).first()
    )
    perfil_id, permissao_id = vinculo.perfil_id, vinculo.permissao_id
    db.close()

    response = client.delete(
        f"/perfis/{perfil_id}/permissoes/{permissao_id}",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert response.status_code == 409


def test_nao_permite_criar_perfil_duplicado(token_admin):
    response = client.post(
        "/perfis/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"nome": "Administrador", "descricao": "duplicado", "ativo": True},
    )
    assert response.status_code == 400


def test_nao_permite_remover_ultimo_administrador_ativo(token_admin):
    # Isola o teste: desativa (sem excluir) todos os OUTROS usuários administradores ativos,
    # restaurando o estado original ao final, para não depender/alterar dados de produção.
    db = SessionLocal()
    perfil_admin = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    usuario_teste = (
        db.query(Usuario).filter(Usuario.email == "rbac.admin.teste@example.com").first()
    )

    outros_admins = (
        db.query(Usuario)
        .join(UsuarioPerfil, UsuarioPerfil.usuario_id == Usuario.id)
        .filter(UsuarioPerfil.perfil_id == perfil_admin.id)
        .filter(Usuario.id != usuario_teste.id)
        .filter(Usuario.ativo.is_(True))
        .all()
    )
    estados_originais = {u.id: u.ativo for u in outros_admins}
    for u in outros_admins:
        u.ativo = False
    db.commit()

    try:
        response = client.delete(
            f"/usuarios/{usuario_teste.id}/perfis/{perfil_admin.id}",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert response.status_code == 409
    finally:
        for u in outros_admins:
            u.ativo = estados_originais[u.id]
        db.commit()
        db.close()
