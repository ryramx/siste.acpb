from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.anexo_financeiro import AnexoFinanceiro
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
    pessoa = Pessoa(nome_completo="Admin Anexos Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="anexos.admin@example.com",
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
def movimentacao_id():
    db = SessionLocal()
    import sqlalchemy as sa

    mov_id = db.execute(sa.text("SELECT id FROM movimentacoes_financeiras LIMIT 1")).scalar()
    db.close()
    return mov_id


def test_upload_com_tipo_nao_permitido_e_rejeitado(token_admin, movimentacao_id):
    response = client.post(
        "/anexos-financeiros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("virus.exe", b"conteudo", "application/x-msdownload")},
    )
    assert response.status_code == 400


def test_upload_com_movimentacao_inexistente_retorna_404(token_admin):
    response = client.post(
        "/anexos-financeiros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"movimentacao_financeira_id": "999999999"},
        files={"arquivo": ("comprovante.pdf", b"%PDF-1.4 conteudo", "application/pdf")},
    )
    assert response.status_code == 404


def test_upload_download_e_exclusao_funcionam(token_admin, movimentacao_id):
    headers = {"Authorization": f"Bearer {token_admin}"}
    conteudo = b"%PDF-1.4 conteudo de teste do comprovante"

    upload = client.post(
        "/anexos-financeiros/",
        headers=headers,
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("comprovante.pdf", conteudo, "application/pdf")},
    )
    assert upload.status_code == 201
    body = upload.json()
    assert body["nome_original"] == "comprovante.pdf"
    assert "nome_armazenado" not in body
    anexo_id = body["id"]

    listar = client.get(
        "/anexos-financeiros/",
        headers=headers,
        params={"movimentacao_financeira_id": movimentacao_id},
    )
    assert listar.status_code == 200
    assert any(a["id"] == anexo_id for a in listar.json())

    download = client.get(f"/anexos-financeiros/{anexo_id}/download", headers=headers)
    assert download.status_code == 200
    assert download.content == conteudo

    excluir = client.delete(f"/anexos-financeiros/{anexo_id}", headers=headers)
    assert excluir.status_code == 204

    db = SessionLocal()
    assert db.query(AnexoFinanceiro).filter(AnexoFinanceiro.id == anexo_id).first() is None
    db.close()

    download_apos_excluir = client.get(f"/anexos-financeiros/{anexo_id}/download", headers=headers)
    assert download_apos_excluir.status_code == 404


def test_download_sem_autenticacao_e_recusado(token_admin, movimentacao_id):
    headers = {"Authorization": f"Bearer {token_admin}"}
    upload = client.post(
        "/anexos-financeiros/",
        headers=headers,
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("comprovante2.pdf", b"%PDF conteudo", "application/pdf")},
    )
    anexo_id = upload.json()["id"]

    sem_token = client.get(f"/anexos-financeiros/{anexo_id}/download")
    assert sem_token.status_code == 401

    client.delete(f"/anexos-financeiros/{anexo_id}", headers=headers)
