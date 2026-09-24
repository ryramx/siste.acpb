"""Observabilidade: id de requisição, tratamento de erro não previsto e limpeza do evento
enviado para fora (ver app/core/monitoramento.py)."""

import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.monitoramento import (
    HEADER_REQUEST_ID,
    _limpar_evento,
    configurar_monitoramento,
    inicializar_sentry,
    request_id_atual,
)
from app.main import app as app_real


def _app_que_falha() -> FastAPI:
    """Uma aplicação mínima com uma rota que estoura, para exercitar o handler sem depender de
    um bug de verdade em alguma rota do sistema."""
    app = FastAPI()
    configurar_monitoramento(app)

    @app.get("/explode")
    def explode():
        raise RuntimeError("segredo-do-banco: senha=123")

    @app.get("/ok")
    def ok():
        return {"request_id": request_id_atual()}

    return app


# `raise_server_exceptions=False` faz o TestClient se comportar como um servidor real: sem isso
# a exceção subiria para o teste em vez de passar pelo handler.
cliente_que_falha = TestClient(_app_que_falha(), raise_server_exceptions=False)


def test_erro_nao_previsto_vira_500_sem_vazar_detalhe():
    resposta = cliente_que_falha.get("/explode")

    assert resposta.status_code == 500
    detalhe = resposta.json()["detail"]
    # Nada de traceback, mensagem da exceção ou nome de tabela para o cliente.
    assert "senha=123" not in detalhe
    assert "RuntimeError" not in detalhe
    assert "Traceback" not in resposta.text


def test_resposta_de_erro_traz_o_codigo_para_o_usuario_informar():
    resposta = cliente_que_falha.get("/explode")

    identificador = resposta.headers[HEADER_REQUEST_ID]
    assert identificador
    # O mesmo código aparece na mensagem: é o que liga o relato do usuário à linha do log.
    assert identificador in resposta.json()["detail"]


def test_erro_vai_para_o_log_com_metodo_caminho_e_id(caplog):
    with caplog.at_level(logging.ERROR):
        resposta = cliente_que_falha.get("/explode")

    registro = next(r for r in caplog.records if "Erro não tratado" in r.getMessage())
    mensagem = registro.getMessage()
    assert "GET" in mensagem
    assert "/explode" in mensagem
    assert resposta.headers[HEADER_REQUEST_ID] in mensagem
    # O traceback fica no log do servidor — é lá que ele serve para algo.
    assert registro.exc_info is not None


def test_toda_resposta_traz_o_id_da_requisicao():
    resposta = cliente_que_falha.get("/ok")
    assert resposta.headers[HEADER_REQUEST_ID]
    assert resposta.json()["request_id"] == resposta.headers[HEADER_REQUEST_ID]


def test_ids_diferentes_em_requisicoes_diferentes():
    primeiro = cliente_que_falha.get("/ok").headers[HEADER_REQUEST_ID]
    segundo = cliente_que_falha.get("/ok").headers[HEADER_REQUEST_ID]
    assert primeiro != segundo


def test_id_recebido_de_fora_e_aproveitado_e_limitado():
    """Para que o rastro atravesse um proxy ou um segundo serviço, no dia em que houver um."""
    resposta = cliente_que_falha.get("/ok", headers={HEADER_REQUEST_ID: "rastro-externo"})
    assert resposta.headers[HEADER_REQUEST_ID] == "rastro-externo"

    longo = cliente_que_falha.get("/ok", headers={HEADER_REQUEST_ID: "x" * 500})
    assert len(longo.headers[HEADER_REQUEST_ID]) == 64


def test_aplicacao_real_registra_o_handler_e_o_middleware():
    """O teste acima usa uma aplicação de mentira; este confere que a de verdade foi equipada."""
    assert Exception in app_real.exception_handlers
    assert any(
        m.cls.__name__ == "RequestIdMiddleware" for m in app_real.user_middleware
    )


def test_sem_dsn_o_relato_externo_fica_desligado():
    # settings.SENTRY_DSN é vazio em .env.test: nada deve ser enviado para fora durante a suíte.
    assert inicializar_sentry() is False


def test_evento_enviado_para_fora_nao_leva_corpo_nem_credencial():
    evento = {
        "request": {
            "url": "https://api/pessoas/",
            "data": {"cpf": "12345678901", "nome_completo": "Maria"},
            "cookies": {"sessao": "abc"},
            "headers": {
                "Authorization": "Bearer token-de-verdade",
                "Cookie": "sessao=abc",
                "User-Agent": "Mozilla",
            },
        }
    }

    limpo = _limpar_evento(evento, {})

    assert limpo is not None
    requisicao = limpo["request"]
    # Corpo de requisição levaria CPF e endereço para fora junto com o erro.
    assert "data" not in requisicao
    assert "cookies" not in requisicao
    assert "Authorization" not in requisicao["headers"]
    assert "Cookie" not in requisicao["headers"]
    # O que não identifica ninguém continua, porque é o que ajuda a reproduzir o erro.
    assert requisicao["headers"]["User-Agent"] == "Mozilla"
    assert requisicao["url"] == "https://api/pessoas/"
