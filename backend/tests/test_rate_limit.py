"""Limite de tentativas nas rotas públicas de autenticação (ver app/core/rate_limit.py).

Os contadores são zerados entre casos pela fixture autouse de `conftest.py`, então cada teste
começa com a cota cheia.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import LimiteDeTentativas
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.senha_reset_token import SenhaResetToken
from app.models.usuario import Usuario

client = TestClient(app)

SENHA_TESTE = "senhaDeTeste123"


@pytest.fixture
def usuario_ativo():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo="Usuário de Teste Rate Limit", created_at=agora, updated_at=agora
    )
    db.add(pessoa)
    db.flush()

    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="teste.ratelimit@example.com",
        senha_hash=hash_password(SENHA_TESTE),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()

    yield usuario.email

    # Os tokens vão primeiro: os testes de recuperação de senha deixam linhas apontando para
    # este usuário, e a chave estrangeira impediria a remoção dele (deixando o e-mail ocupado
    # e quebrando o próximo run com violação de unicidade).
    db.query(SenhaResetToken).filter(SenhaResetToken.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def _errar_login(email: str) -> int:
    return client.post("/auth/login", json={"email": email, "senha": "senhaErrada"}).status_code


# --- Login -------------------------------------------------------------------------------


def test_login_bloqueia_apos_o_maximo_de_falhas_no_mesmo_email(usuario_ativo):
    for _ in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL):
        assert _errar_login(usuario_ativo) == 401

    resposta = client.post(
        "/auth/login", json={"email": usuario_ativo, "senha": "senhaErrada"}
    )
    assert resposta.status_code == 429
    assert "Retry-After" in resposta.headers
    assert int(resposta.headers["Retry-After"]) > 0


def test_login_bloqueado_recusa_ate_a_senha_certa(usuario_ativo):
    """O bloqueio é da tentativa, não da senha: enquanto a janela não passa, nem a senha
    correta entra. É isso que impede o atacante de usar o acerto como oráculo."""
    for _ in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL):
        _errar_login(usuario_ativo)

    resposta = client.post("/auth/login", json={"email": usuario_ativo, "senha": SENHA_TESTE})
    assert resposta.status_code == 429


def test_senha_certa_antes_do_limite_funciona_e_zera_a_contagem(usuario_ativo):
    """Quem erra a senha algumas vezes e acerta não fica com um saldo de falhas pendurado."""
    for _ in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL - 1):
        assert _errar_login(usuario_ativo) == 401

    assert client.post(
        "/auth/login", json={"email": usuario_ativo, "senha": SENHA_TESTE}
    ).status_code == 200

    # Contagem zerada: cabem de novo todas as falhas da cota, sem 429.
    for _ in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL):
        assert _errar_login(usuario_ativo) == 401


def test_email_com_caixa_diferente_conta_na_mesma_cota(usuario_ativo):
    """Senão, trocar uma letra para maiúscula daria uma cota nova a cada variação."""
    for i in range(settings.LOGIN_MAX_FALHAS_POR_EMAIL):
        variacao = usuario_ativo.upper() if i % 2 else usuario_ativo
        assert _errar_login(variacao) == 401

    assert _errar_login(usuario_ativo.title()) == 429


def test_login_bloqueia_por_ip_ao_varrer_muitos_emails():
    """O limite por e-mail não pega quem tenta poucas vezes em muitas contas — este pega."""
    for i in range(settings.LOGIN_MAX_FALHAS_POR_IP):
        assert _errar_login(f"varredura.{i}@example.com") == 401

    assert _errar_login("varredura.final@example.com") == 429


# --- Recuperação de senha ----------------------------------------------------------------


def test_recuperacao_bloqueia_apos_o_maximo_de_pedidos(usuario_ativo):
    for _ in range(settings.RECUPERACAO_MAX_POR_EMAIL):
        assert client.post(
            "/auth/recuperar-senha", json={"email": usuario_ativo}
        ).status_code == 202

    resposta = client.post("/auth/recuperar-senha", json={"email": usuario_ativo})
    assert resposta.status_code == 429
    assert int(resposta.headers["Retry-After"]) > 0


def test_recuperacao_limita_email_inexistente_do_mesmo_jeito():
    """Se só o e-mail cadastrado fosse limitado, o 429 viraria um sinal de que a conta existe —
    justamente a enumeração que a resposta idêntica da rota evita."""
    inexistente = "nao.existe.ratelimit@example.com"
    for _ in range(settings.RECUPERACAO_MAX_POR_EMAIL):
        assert client.post("/auth/recuperar-senha", json={"email": inexistente}).status_code == 202

    assert client.post("/auth/recuperar-senha", json={"email": inexistente}).status_code == 429


def test_recuperacao_bloqueia_por_ip_com_emails_diferentes():
    for i in range(settings.RECUPERACAO_MAX_POR_IP):
        assert client.post(
            "/auth/recuperar-senha", json={"email": f"pedido.{i}@example.com"}
        ).status_code == 202

    assert client.post(
        "/auth/recuperar-senha", json={"email": "pedido.final@example.com"}
    ).status_code == 429


# --- Janela deslizante (unitário) --------------------------------------------------------


def test_janela_libera_quando_as_tentativas_envelhecem(monkeypatch):
    """Sem isto o limite seria um bloqueio permanente: o ponto é conter o volume, não punir."""
    agora = [1000.0]
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: agora[0])

    limite = LimiteDeTentativas("teste", maximo=2, janela_segundos=60)
    limite.registrar("chave")
    limite.registrar("chave")
    assert limite.segundos_de_espera("chave") is not None

    agora[0] += 61
    assert limite.segundos_de_espera("chave") is None


def test_espera_informada_diminui_conforme_a_janela_corre(monkeypatch):
    agora = [1000.0]
    monkeypatch.setattr("app.core.rate_limit.time.monotonic", lambda: agora[0])

    limite = LimiteDeTentativas("teste", maximo=1, janela_segundos=600)
    limite.registrar("chave")
    inicial = limite.segundos_de_espera("chave")

    agora[0] += 300
    assert inicial is not None
    assert limite.segundos_de_espera("chave") < inicial


def test_chaves_diferentes_nao_compartilham_cota():
    limite = LimiteDeTentativas("teste", maximo=1, janela_segundos=600)
    limite.registrar("a")
    assert limite.segundos_de_espera("a") is not None
    assert limite.segundos_de_espera("b") is None
