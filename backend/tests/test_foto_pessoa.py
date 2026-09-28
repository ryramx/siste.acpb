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
    pessoa = Pessoa(nome_completo="Admin Foto Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="foto.admin@example.com",
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
    pessoa = Pessoa(nome_completo="Pessoa Sem Foto", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    yield pessoa.id
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_pessoa_nova_nao_tem_foto_por_padrao(token_admin, pessoa_teste):
    response = client.get(
        f"/pessoas/{pessoa_teste}", headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert response.status_code == 200
    assert response.json()["tem_foto"] is False


def test_download_foto_quando_nao_existe_retorna_404(token_admin, pessoa_teste):
    response = client.get(
        f"/pessoas/{pessoa_teste}/foto", headers={"Authorization": f"Bearer {token_admin}"}
    )
    assert response.status_code == 404


def test_upload_com_tipo_nao_permitido_e_rejeitado(token_admin, pessoa_teste):
    response = client.post(
        f"/pessoas/{pessoa_teste}/foto",
        headers={"Authorization": f"Bearer {token_admin}"},
        files={"arquivo": ("virus.exe", b"conteudo", "application/x-msdownload")},
    )
    assert response.status_code == 400


def test_pdf_declarado_como_png_e_rejeitado(token_admin, pessoa_teste):
    response = client.post(
        f"/pessoas/{pessoa_teste}/foto",
        headers={"Authorization": f"Bearer {token_admin}"},
        files={"arquivo": ("foto.png", b"%PDF-1.4 nao e imagem", "image/png")},
    )
    assert response.status_code == 400


def test_upload_download_substituicao_e_remocao_de_foto(token_admin, pessoa_teste):
    headers = {"Authorization": f"Bearer {token_admin}"}
    conteudo1 = b"\x89PNG\r\n conteudo fake da imagem 1"

    upload1 = client.post(
        f"/pessoas/{pessoa_teste}/foto",
        headers=headers,
        files={"arquivo": ("foto.png", conteudo1, "image/png")},
    )
    assert upload1.status_code == 200
    assert upload1.json()["tem_foto"] is True

    download1 = client.get(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert download1.status_code == 200
    assert download1.content == conteudo1

    # Substituir por uma nova foto deve remover a anterior do armazenamento
    conteudo2 = b"\x89PNG\r\n conteudo fake da imagem 2 - diferente"
    upload2 = client.post(
        f"/pessoas/{pessoa_teste}/foto",
        headers=headers,
        files={"arquivo": ("foto2.png", conteudo2, "image/png")},
    )
    assert upload2.status_code == 200

    download2 = client.get(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert download2.status_code == 200
    assert download2.content == conteudo2

    remover = client.delete(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert remover.status_code == 204

    download_apos_remover = client.get(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert download_apos_remover.status_code == 404

    pessoa_final = client.get(f"/pessoas/{pessoa_teste}", headers=headers)
    assert pessoa_final.json()["tem_foto"] is False


def test_me_reflete_tem_foto_do_usuario_logado(token_admin):
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token_admin}"})
    assert response.status_code == 200
    assert response.json()["tem_foto"] is False


@pytest.fixture
def usuario_sem_permissoes():
    """Usuário sem nenhum perfil/permissão vinculado, para validar que qualquer pessoa
    consegue gerenciar a própria foto mesmo sem a permissão pessoas.editar/visualizar."""
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Usuario Sem Permissao", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="foto.sempermissao@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = create_access_token(subject=str(usuario.id))

    yield token, pessoa.id

    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_usuario_sem_permissao_gerencia_a_propria_foto(usuario_sem_permissoes):
    token, pessoa_id = usuario_sem_permissoes
    headers = {"Authorization": f"Bearer {token}"}
    conteudo = b"\x89PNG\r\n conteudo fake da propria foto"

    upload = client.post(
        f"/pessoas/{pessoa_id}/foto",
        headers=headers,
        files={"arquivo": ("selfie.png", conteudo, "image/png")},
    )
    assert upload.status_code == 200

    download = client.get(f"/pessoas/{pessoa_id}/foto", headers=headers)
    assert download.status_code == 200
    assert download.content == conteudo

    remover = client.delete(f"/pessoas/{pessoa_id}/foto", headers=headers)
    assert remover.status_code == 204


def test_usuario_sem_permissao_nao_gerencia_foto_de_outra_pessoa(usuario_sem_permissoes, pessoa_teste):
    token, _ = usuario_sem_permissoes
    headers = {"Authorization": f"Bearer {token}"}

    upload = client.post(
        f"/pessoas/{pessoa_teste}/foto",
        headers=headers,
        files={"arquivo": ("selfie.png", b"conteudo", "image/png")},
    )
    assert upload.status_code == 403

    download = client.get(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert download.status_code == 403

    remover = client.delete(f"/pessoas/{pessoa_teste}/foto", headers=headers)
    assert remover.status_code == 403
