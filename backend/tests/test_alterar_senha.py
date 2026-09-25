"""Troca da própria senha, com o usuário logado (`POST /auth/alterar-senha`).

Antes desta rota o único caminho era a recuperação por e-mail, que serve ao esquecimento — não
à troca deliberada de quem desconfia que a senha foi vista.
"""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token, generate_reset_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.pessoa import Pessoa
from app.models.senha_reset_token import SenhaResetToken
from app.models.usuario import Usuario

client = TestClient(app)

SENHA_ATUAL = "senhaAtual123"
SENHA_NOVA = "senhaNova456"


@pytest.fixture
def usuario():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário Troca de Senha", created_at=agora, updated_at=agora
    )
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="troca.senha@example.com",
        senha_hash=hash_password(SENHA_ATUAL),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()
    dados = {"id": usuario.id, "email": usuario.email, "pessoa_id": pessoa.id}
    db.close()

    yield dados

    db = SessionLocal()
    db.query(Auditoria).filter(Auditoria.usuario_id == dados["id"]).delete()
    db.query(SenhaResetToken).filter(SenhaResetToken.usuario_id == dados["id"]).delete()
    db.query(Usuario).filter(Usuario.id == dados["id"]).delete()
    db.query(Pessoa).filter(Pessoa.id == dados["pessoa_id"]).delete()
    db.commit()
    db.close()


def _headers(usuario) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(subject=str(usuario['id']))}"}


def test_troca_senha_e_permite_login_com_a_nova(usuario):
    resposta = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": SENHA_NOVA},
    )
    assert resposta.status_code == 204

    assert client.post(
        "/auth/login", json={"email": usuario["email"], "senha": SENHA_NOVA}
    ).status_code == 200
    assert client.post(
        "/auth/login", json={"email": usuario["email"], "senha": SENHA_ATUAL}
    ).status_code == 401


def test_senha_atual_errada_e_recusada(usuario):
    """Exigir a senha atual é o que impede que um token vazado tome a conta em definitivo."""
    resposta = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": "chutePerdido", "senha_nova": SENHA_NOVA},
    )
    assert resposta.status_code == 400
    assert "atual" in resposta.json()["detail"].lower()

    # E a senha continua a de antes.
    assert client.post(
        "/auth/login", json={"email": usuario["email"], "senha": SENHA_ATUAL}
    ).status_code == 200


def test_senha_nova_igual_a_atual_e_recusada(usuario):
    resposta = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": SENHA_ATUAL},
    )
    assert resposta.status_code == 400


def test_senha_nova_curta_e_recusada(usuario):
    resposta = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": "abcd"},
    )
    assert resposta.status_code == 422


def test_senha_nova_com_o_minimo_de_5_caracteres_e_aceita(usuario):
    resposta = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": "abcde"},
    )
    assert resposta.status_code == 204


def test_sem_token_e_recusado(usuario):
    resposta = client.post(
        "/auth/alterar-senha",
        json={"senha_atual": SENHA_ATUAL, "senha_nova": SENHA_NOVA},
    )
    assert resposta.status_code == 401


def test_tentativas_de_senha_atual_sao_limitadas(usuario):
    """Senão a rota viraria um oráculo para adivinhar a senha de quem teve o token vazado."""
    for _ in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL):
        assert client.post(
            "/auth/alterar-senha",
            headers=_headers(usuario),
            json={"senha_atual": "errada", "senha_nova": SENHA_NOVA},
        ).status_code == 400

    bloqueada = client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": "errada", "senha_nova": SENHA_NOVA},
    )
    assert bloqueada.status_code == 429


def test_troca_invalida_tokens_de_recuperacao_pendentes(usuario):
    """Quem troca a senha por desconfiança não ganharia nada se um link de redefinição pedido
    antes continuasse valendo — seria o caminho de volta para quem tomou o e-mail."""
    token_bruto, token_hash = generate_reset_token()
    db = SessionLocal()
    db.add(
        SenhaResetToken(
            usuario_id=usuario["id"],
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
            created_at=datetime.utcnow(),
        )
    )
    db.commit()
    db.close()

    assert client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": SENHA_NOVA},
    ).status_code == 204

    recusado = client.post(
        "/auth/redefinir-senha",
        json={"token": token_bruto, "senha_nova": "outraSenha789"},
    )
    assert recusado.status_code == 400


def test_troca_fica_registrada_na_auditoria_sem_a_senha(usuario):
    assert client.post(
        "/auth/alterar-senha",
        headers=_headers(usuario),
        json={"senha_atual": SENHA_ATUAL, "senha_nova": SENHA_NOVA},
    ).status_code == 204

    db = SessionLocal()
    registro = (
        db.query(Auditoria)
        .filter(Auditoria.usuario_id == usuario["id"], Auditoria.tabela == "usuarios")
        .order_by(Auditoria.id.desc())
        .first()
    )
    assert registro is not None
    assert registro.acao == "editar"
    assert "senha" in (registro.descricao or "").lower()
    # Nem a senha nem o hash podem aparecer na trilha de auditoria.
    conteudo = f"{registro.dados_anteriores} {registro.dados_novos}"
    assert SENHA_NOVA not in conteudo
    assert "senha_hash" not in conteudo
    db.close()
