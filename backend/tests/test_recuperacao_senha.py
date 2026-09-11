import re
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password, hash_reset_token, verify_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.senha_reset_token import SenhaResetToken
from app.models.usuario import Usuario

client = TestClient(app)


@pytest.fixture
def usuario_teste():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Usuário Reset Senha", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="reset.senha.teste@example.com",
        senha_hash=hash_password("senhaAntiga123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    yield usuario

    db.query(SenhaResetToken).filter(SenhaResetToken.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def _extrair_token_do_log(caplog) -> str:
    match = re.search(r"usuario_id=\d+: (\S+) \(expira", caplog.text)
    assert match, f"token não encontrado no log: {caplog.text}"
    return match.group(1)


def test_solicitar_recuperacao_para_email_existente_gera_token(usuario_teste, caplog):
    with caplog.at_level("INFO"):
        response = client.post(
            "/auth/recuperar-senha", json={"email": usuario_teste.email}
        )
    assert response.status_code == 202

    token_bruto = _extrair_token_do_log(caplog)

    db = SessionLocal()
    registro = (
        db.query(SenhaResetToken)
        .filter(SenhaResetToken.usuario_id == usuario_teste.id)
        .first()
    )
    assert registro is not None
    assert registro.token_hash == hash_reset_token(token_bruto)
    db.close()


def test_solicitar_recuperacao_para_email_inexistente_nao_revela_nada():
    response = client.post(
        "/auth/recuperar-senha", json={"email": "nao.existe.reset@example.com"}
    )
    assert response.status_code == 202
    assert "enviadas" in response.json()["detail"]


def test_confirmar_recuperacao_com_token_valido_altera_senha(usuario_teste, caplog):
    with caplog.at_level("INFO"):
        client.post("/auth/recuperar-senha", json={"email": usuario_teste.email})
    token_bruto = _extrair_token_do_log(caplog)

    response = client.post(
        "/auth/redefinir-senha",
        json={"token": token_bruto, "senha_nova": "senhaNovaForte123"},
    )
    assert response.status_code == 204

    db = SessionLocal()
    usuario_atualizado = db.query(Usuario).filter(Usuario.id == usuario_teste.id).first()
    assert verify_password("senhaNovaForte123", usuario_atualizado.senha_hash)
    db.close()

    # Login com a senha antiga deve falhar; com a nova deve funcionar
    login_antigo = client.post(
        "/auth/login", json={"email": usuario_teste.email, "senha": "senhaAntiga123"}
    )
    assert login_antigo.status_code == 401

    login_novo = client.post(
        "/auth/login", json={"email": usuario_teste.email, "senha": "senhaNovaForte123"}
    )
    assert login_novo.status_code == 200


def test_token_ja_usado_nao_pode_ser_reaproveitado(usuario_teste, caplog):
    with caplog.at_level("INFO"):
        client.post("/auth/recuperar-senha", json={"email": usuario_teste.email})
    token_bruto = _extrair_token_do_log(caplog)

    primeira = client.post(
        "/auth/redefinir-senha",
        json={"token": token_bruto, "senha_nova": "primeiraSenhaNova123"},
    )
    assert primeira.status_code == 204

    segunda = client.post(
        "/auth/redefinir-senha",
        json={"token": token_bruto, "senha_nova": "segundaSenhaNova123"},
    )
    assert segunda.status_code == 400


def test_token_expirado_e_recusado(usuario_teste):
    token_bruto = "token-de-teste-expirado"
    db = SessionLocal()
    db.add(
        SenhaResetToken(
            usuario_id=usuario_teste.id,
            token_hash=hash_reset_token(token_bruto),
            expires_at=datetime.utcnow() - timedelta(minutes=1),
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.close()

    response = client.post(
        "/auth/redefinir-senha",
        json={"token": token_bruto, "senha_nova": "outraSenhaForte123"},
    )
    assert response.status_code == 400


def test_token_invalido_e_recusado():
    response = client.post(
        "/auth/redefinir-senha",
        json={"token": "token-que-nunca-existiu", "senha_nova": "outraSenhaForte123"},
    )
    assert response.status_code == 400
