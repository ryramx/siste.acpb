"""Travas contra perder o acesso ao sistema (RQ-04 da rodada de QA de 25/09/2026).

Antes, qualquer administrador podia desativar a si mesmo, o último admin ativo ou o dono do
sistema. O script de recuperação (scripts/criar_admin.py) se recusa a rodar enquanto houver
algum admin ativo, então o dono desativado por outro admin ficava sem caminho de volta.
"""

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.perfil import Perfil
from app.models.perfil_permissao import PerfilPermissao
from app.models.permissao import Permissao
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)
BACKEND_DIR = Path(__file__).resolve().parent.parent


def _criar_usuario(db, email: str, nome_perfil: str | None, protegido: bool = False) -> Usuario:
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo=f"Teste Protecao {email}", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email=email,
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        protegido=protegido,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    if nome_perfil:
        perfil = db.query(Perfil).filter(Perfil.nome == nome_perfil).first()
        db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()
    return usuario


def _limpar(db, *usuarios: Usuario) -> None:
    ids = [u.id for u in usuarios]
    pessoas = [u.pessoa_id for u in usuarios]
    db.query(Auditoria).filter(Auditoria.usuario_id.in_(ids)).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id.in_(ids)).delete()
    db.query(Usuario).filter(Usuario.id.in_(ids)).delete()
    db.query(Pessoa).filter(Pessoa.id.in_(pessoas)).delete()
    db.commit()


def _h(usuario: Usuario) -> dict:
    return {"Authorization": f"Bearer {create_access_token(subject=str(usuario.id))}"}


def _perfil_admin_id(db) -> int:
    return db.query(Perfil).filter(Perfil.nome == "Administrador").first().id


def _bloqueios(db, ator_id: int) -> list[Auditoria]:
    return (
        db.query(Auditoria)
        .filter(Auditoria.usuario_id == ator_id, Auditoria.acao == "bloquear")
        .all()
    )


@pytest.fixture
def db():
    sessao = SessionLocal()
    yield sessao
    sessao.close()


@pytest.fixture
def dois_admins(db):
    """Um admin comum (o ator) e o dono do sistema, marcado como conta principal."""
    ator = _criar_usuario(db, "protecao.ator@example.com", "Administrador")
    dono = _criar_usuario(db, "protecao.dono@example.com", "Administrador", protegido=True)
    yield ator, dono
    db.rollback()
    _limpar(db, ator, dono)


def test_admin_nao_desativa_a_propria_conta(dois_admins, db):
    ator, _ = dois_admins

    r = client.post(f"/usuarios/{ator.id}/desativar", headers=_h(ator))
    assert r.status_code == 403
    assert "própria conta" in r.json()["detail"]

    # Pelo PUT também: é o mesmo efeito por outro caminho.
    r = client.put(f"/usuarios/{ator.id}", headers=_h(ator), json={"ativo": False})
    assert r.status_code == 403

    db.expire_all()
    assert db.get(Usuario, ator.id).ativo is True
    assert len(_bloqueios(db, ator.id)) == 2


def test_admin_nao_remove_o_proprio_perfil_de_administrador(dois_admins, db):
    ator, _ = dois_admins
    r = client.delete(f"/usuarios/{ator.id}/perfis/{_perfil_admin_id(db)}", headers=_h(ator))
    assert r.status_code == 403
    assert "próprio perfil" in r.json()["detail"]


def test_outro_admin_nao_altera_a_conta_principal(dois_admins, db):
    ator, dono = dois_admins
    h = _h(ator)

    assert client.post(f"/usuarios/{dono.id}/desativar", headers=h).status_code == 403
    assert client.put(f"/usuarios/{dono.id}", headers=h, json={"ativo": False}).status_code == 403
    assert (
        client.put(f"/usuarios/{dono.id}", headers=h, json={"email": "tomada@example.com"})
        .status_code
        == 403
    )
    assert (
        client.post(
            f"/usuarios/{dono.id}/redefinir-senha", headers=h, json={"senha_nova": "tomada123"}
        ).status_code
        == 403
    )
    assert (
        client.delete(f"/usuarios/{dono.id}/perfis/{_perfil_admin_id(db)}", headers=h).status_code
        == 403
    )

    db.expire_all()
    dono_db = db.get(Usuario, dono.id)
    assert dono_db.ativo is True
    assert dono_db.email == "protecao.dono@example.com"
    # Todas as tentativas ficam na auditoria, em nome de quem tentou.
    assert len(_bloqueios(db, ator.id)) == 5


def test_conta_principal_altera_os_proprios_dados(dois_admins):
    _, dono = dois_admins
    r = client.put(
        f"/usuarios/{dono.id}", headers=_h(dono), json={"email": "protecao.dono2@example.com"}
    )
    assert r.status_code == 200
    assert r.json()["protegido"] is True


def test_admin_continua_desativando_um_admin_comum(dois_admins, db):
    ator, dono = dois_admins
    outro = _criar_usuario(db, "protecao.outro@example.com", "Administrador")
    try:
        r = client.post(f"/usuarios/{outro.id}/desativar", headers=_h(ator))
        assert r.status_code == 200
        assert r.json()["ativo"] is False
    finally:
        _limpar(db, outro)


def test_nao_desativa_o_ultimo_administrador_ativo(db):
    """Só admin tem `usuarios.editar` na matriz padrão, mas um admin pode concedê-la a outro
    perfil. Quem a recebeu não pode desativar o último administrador ativo."""
    agora = datetime.utcnow()
    perfil = Perfil(nome="Teste Gestor de Usuarios", ativo=True, created_at=agora, updated_at=agora)
    db.add(perfil)
    db.flush()
    permissao = db.query(Permissao).filter(Permissao.nome == "usuarios.editar").first()
    db.add(PerfilPermissao(perfil_id=perfil.id, permissao_id=permissao.id, created_at=agora))
    db.commit()

    ator = _criar_usuario(db, "protecao.gestor@example.com", "Teste Gestor de Usuarios")
    unico_admin = _criar_usuario(db, "protecao.unico@example.com", "Administrador")

    outros = (
        db.query(Usuario)
        .join(UsuarioPerfil, UsuarioPerfil.usuario_id == Usuario.id)
        .filter(UsuarioPerfil.perfil_id == _perfil_admin_id(db))
        .filter(Usuario.id != unico_admin.id, Usuario.ativo.is_(True))
        .all()
    )
    for u in outros:
        u.ativo = False
    db.commit()

    try:
        r = client.post(f"/usuarios/{unico_admin.id}/desativar", headers=_h(ator))
        assert r.status_code == 409
        r = client.delete(
            f"/usuarios/{unico_admin.id}/perfis/{_perfil_admin_id(db)}", headers=_h(ator)
        )
        assert r.status_code == 409
    finally:
        for u in outros:
            u.ativo = True
        db.commit()
        _limpar(db, ator, unico_admin)
        db.query(PerfilPermissao).filter(PerfilPermissao.perfil_id == perfil.id).delete()
        db.query(Perfil).filter(Perfil.id == perfil.id).delete()
        db.commit()


def _rodar_proteger(*args, **variaveis) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "scripts.proteger_conta", *args],
        cwd=BACKEND_DIR,
        env={**os.environ, "ENVIRONMENT": "test", **variaveis},
        capture_output=True,
        text=True,
    )


def test_script_marca_e_desmarca_a_conta_principal(db):
    admin = _criar_usuario(db, "protecao.script@example.com", "Administrador")
    voluntario = _criar_usuario(db, "protecao.script.vol@example.com", "Voluntário")
    try:
        r = _rodar_proteger(CONTA_EMAIL=admin.email)
        assert r.returncode == 0, r.stderr
        db.expire_all()
        assert db.get(Usuario, admin.id).protegido is True

        r = _rodar_proteger("--remover", CONTA_EMAIL=admin.email)
        assert r.returncode == 0, r.stderr
        db.expire_all()
        assert db.get(Usuario, admin.id).protegido is False

        # Só administrador pode ser a conta principal.
        r = _rodar_proteger(CONTA_EMAIL=voluntario.email)
        assert r.returncode == 1
        assert "Administrador" in r.stderr
    finally:
        _limpar(db, admin, voluntario)
