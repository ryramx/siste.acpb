from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.anexo_financeiro import AnexoFinanceiro
from app.models.auditoria import Auditoria
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.conta_financeira import ContaFinanceira
from app.models.movimentacao_financeira import MovimentacaoFinanceira
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
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Responsavel Anexo Teste", created_at=agora, updated_at=agora)
    conta = ContaFinanceira(
        nome="Conta Anexo Teste", tipo="corrente", saldo_inicial=0, ativo=True,
        created_at=agora, updated_at=agora,
    )
    categoria = CategoriaFinanceira(
        nome="Categoria Anexo Teste", tipo="despesa", ativo=True,
        created_at=agora, updated_at=agora,
    )
    db.add_all([pessoa, conta, categoria])
    db.flush()
    movimentacao = MovimentacaoFinanceira(
        conta_financeira_id=conta.id,
        categoria_id=categoria.id,
        responsavel_id=pessoa.id,
        tipo="despesa",
        descricao="Movimentacao Anexo Teste",
        valor=10,
        data_movimentacao="2026-01-01",
        status="confirmada",
        created_at=agora,
        updated_at=agora,
    )
    db.add(movimentacao)
    db.commit()
    mov_id = movimentacao.id
    pessoa_id, conta_id, categoria_id = pessoa.id, conta.id, categoria.id
    db.close()

    yield mov_id

    db = SessionLocal()
    db.query(AnexoFinanceiro).filter(
        AnexoFinanceiro.movimentacao_financeira_id == mov_id
    ).delete()
    db.query(MovimentacaoFinanceira).filter(MovimentacaoFinanceira.id == mov_id).delete()
    db.query(ContaFinanceira).filter(ContaFinanceira.id == conta_id).delete()
    db.query(CategoriaFinanceira).filter(CategoriaFinanceira.id == categoria_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_upload_com_tipo_nao_permitido_e_rejeitado(token_admin, movimentacao_id):
    response = client.post(
        "/anexos-financeiros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("virus.exe", b"conteudo", "application/x-msdownload")},
    )
    assert response.status_code == 400


def test_exe_renomeado_para_pdf_e_rejeitado(token_admin, movimentacao_id):
    """O navegador declara application/pdf pela extensão; o conteúdo é de executável."""
    response = client.post(
        "/anexos-financeiros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("comprovante.pdf", b"MZ\x90\x00 executavel", "application/pdf")},
    )
    assert response.status_code == 400
    assert "conteúdo" in response.json()["detail"]


def test_arquivo_acima_do_limite_retorna_413(token_admin, movimentacao_id):
    grande = b"%PDF-1.4 " + b"0" * (5 * 1024 * 1024)
    response = client.post(
        "/anexos-financeiros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        data={"movimentacao_financeira_id": str(movimentacao_id)},
        files={"arquivo": ("grande.pdf", grande, "application/pdf")},
    )
    assert response.status_code == 413
    assert "5MB" in response.json()["detail"]


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


def test_excluir_movimentacao_com_comprovante_e_recusado(token_admin, movimentacao_id):
    """O comprovante é documento contábil: excluir o lançamento não pode levá-lo embora de
    tabela. A recusa precisa dizer o que fazer — a mensagem genérica de integridade
    referencial deixava o usuário sem saída na tela."""
    headers = {"Authorization": f"Bearer {token_admin}"}
    envio = client.post(
        "/anexos-financeiros/",
        headers=headers,
        data={"movimentacao_financeira_id": movimentacao_id},
        files={"arquivo": ("recibo.pdf", b"%PDF-1.4 conteudo", "application/pdf")},
    )
    assert envio.status_code == 201
    anexo_id = envio.json()["id"]

    recusa = client.delete(f"/movimentacoes-financeiras/{movimentacao_id}", headers=headers)
    assert recusa.status_code == 409
    assert "comprovante" in recusa.json()["detail"].lower()

    # E o caminho de saída funciona: sem comprovantes, a exclusão passa.
    assert client.delete(f"/anexos-financeiros/{anexo_id}", headers=headers).status_code == 204
    assert client.delete(
        f"/movimentacoes-financeiras/{movimentacao_id}", headers=headers
    ).status_code == 204
