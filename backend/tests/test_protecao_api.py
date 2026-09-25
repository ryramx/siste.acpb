"""Proteção básica da API (RQ-09 da rodada de QA de 25/09/2026)."""

from fastapi.testclient import TestClient

from app.core import protecao
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def test_toda_resposta_leva_os_cabecalhos_de_seguranca():
    resposta = client.get("/")
    assert resposta.headers["x-content-type-options"] == "nosniff"
    assert resposta.headers["x-frame-options"] == "DENY"
    assert resposta.headers["referrer-policy"] == "no-referrer"
    # HSTS só em produção: em http://localhost ele travaria o navegador do desenvolvedor.
    assert "strict-transport-security" not in resposta.headers


def test_corpo_grande_demais_e_recusado_antes_de_ler():
    grande = b"0" * (6 * 1024 * 1024 + 1)
    resposta = client.post("/pessoas/", content=grande, headers={"Content-Type": "application/json"})
    assert resposta.status_code == 413
    assert "tamanho máximo" in resposta.json()["detail"]
    assert resposta.headers["x-content-type-options"] == "nosniff"


def test_escrita_demais_recebe_429_com_retry_after(monkeypatch):
    monkeypatch.setattr(protecao._limite_escrita, "maximo", 3)
    token = create_access_token(subject="999999")
    cabecalhos = {"Authorization": f"Bearer {token}"}

    # O usuário não existe, então cada chamada dá 401 — mas conta como tentativa de escrita.
    for _ in range(3):
        assert client.post("/pessoas/", json={}, headers=cabecalhos).status_code == 401

    resposta = client.post("/pessoas/", json={}, headers=cabecalhos)
    assert resposta.status_code == 429
    assert int(resposta.headers["retry-after"]) > 0

    # O limite é por usuário: outro token continua passando.
    outro = {"Authorization": f"Bearer {create_access_token(subject='999998')}"}
    assert client.post("/pessoas/", json={}, headers=outro).status_code == 401


def test_leitura_e_login_nao_entram_no_limite_de_escrita(monkeypatch):
    monkeypatch.setattr(protecao._limite_escrita, "maximo", 1)
    for _ in range(3):
        assert client.get("/").status_code == 200
        resposta = client.post("/auth/login", json={"email": "x@example.com", "senha": "errada"})
        # Senha errada: 401 do login, e não 429 do limite de escrita.
        assert resposta.status_code == 401


def test_upload_tem_limite_proprio(monkeypatch):
    monkeypatch.setattr(protecao._limite_upload, "maximo", 1)
    cabecalhos = {"Authorization": f"Bearer {create_access_token(subject='999997')}"}
    client.post("/anexos-financeiros/", headers=cabecalhos)
    assert client.post("/anexos-financeiros/", headers=cabecalhos).status_code == 429
    # Escrita comum do mesmo usuário continua com o limite dela.
    assert client.post("/pessoas/", json={}, headers=cabecalhos).status_code == 401
