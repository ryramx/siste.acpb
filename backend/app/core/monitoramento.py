"""Observabilidade: log estruturado, identificador de requisição e relato de erro externo.

**Por que existe.** Até aqui, um erro 500 em produção só era conhecido por quem fosse abrir o
log do Render no momento certo — o usuário via uma mensagem genérica e ninguém ficava sabendo.
O sistema roda numa associação, sem plantão: um erro que ninguém vê é um erro que ninguém
corrige.

Três peças, do mais simples ao mais completo:

1. **Log com formato fixo** (`configurar_logging`), com hora, nível e logger em toda linha. Sem
   isso as mensagens da aplicação se misturavam à saída do Uvicorn sem contexto de tempo.
2. **Identificador de requisição** (`RequestIdMiddleware`), devolvido no header `X-Request-Id`.
   É o que liga o print da tela do usuário ("deu erro") à linha exata do log.
3. **Relato externo** (`inicializar_sentry`), opcional, ligado só quando `SENTRY_DSN` existe.
   Sem DSN, nada é enviado para fora e o resto continua funcionando — é assim em
   desenvolvimento e nos testes.

**Privacidade.** O sistema guarda CPF e dados socioeconômicos de beneficiários, então o que sai
daqui para um serviço externo é deliberadamente pobre: sem corpo de requisição, sem cabeçalhos
de autenticação, sem cookies e sem identificação pessoal automática. Ver a seção "Logs" em
`PRIVACIDADE_E_RETENCAO.md`.
"""

import logging
import uuid
from contextvars import ContextVar

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

HEADER_REQUEST_ID = "X-Request-Id"

# Vale por requisição, inclusive sob concorrência: `ContextVar` é isolada por contexto async, o
# que uma variável de módulo comum não seria.
_request_id: ContextVar[str] = ContextVar("request_id", default="-")


def request_id_atual() -> str:
    return _request_id.get()


class _FiltroDeRequestId(logging.Filter):
    """Coloca o id da requisição em toda linha de log, inclusive nas emitidas por código que
    não sabe que está dentro de uma requisição (SQLAlchemy, Uvicorn, bibliotecas)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_atual()
        return True


def configurar_logging() -> None:
    formato = "%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s"
    manipulador = logging.StreamHandler()
    manipulador.setFormatter(logging.Formatter(formato))
    manipulador.addFilter(_FiltroDeRequestId())

    raiz = logging.getLogger()
    # Substitui os manipuladores em vez de somar: chamar isto duas vezes (recarga do Uvicorn em
    # desenvolvimento) duplicaria cada linha do log.
    raiz.handlers = [manipulador]
    raiz.setLevel(settings.LOG_LEVEL.upper())


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Gera (ou aproveita) o id da requisição e o devolve no header da resposta.

    Um id vindo de fora é aceito para que, no dia em que houver um proxy ou um segundo serviço
    na frente, o rastro atravesse os dois. Ele nunca é usado para decidir nada — só para
    correlacionar log —, então não há risco em confiar no valor do cliente; mesmo assim o
    tamanho é limitado, para que ninguém escreva um romance no log.
    """

    async def dispatch(self, request: Request, call_next):
        recebido = (request.headers.get(HEADER_REQUEST_ID) or "").strip()
        identificador = recebido[:64] if recebido else uuid.uuid4().hex[:12]
        token = _request_id.set(identificador)
        try:
            resposta = await call_next(request)
            resposta.headers[HEADER_REQUEST_ID] = identificador
            return resposta
        finally:
            _request_id.reset(token)


async def _tratar_erro_nao_previsto(request: Request, exc: Exception) -> JSONResponse:
    """Último anteparo: qualquer exceção que escape de uma rota passa por aqui.

    O usuário recebe uma mensagem genérica com o id da requisição — detalhe técnico nunca vai
    para o cliente (ver `PRIVACIDADE_E_RETENCAO.md`). O log do servidor, esse sim, recebe o
    traceback completo com método, caminho e id.
    """
    identificador = request_id_atual()
    logger.exception(
        "Erro não tratado em %s %s (request_id=%s)",
        request.method,
        request.url.path,
        identificador,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": (
                "Erro interno no servidor. Se o problema continuar, informe o código "
                f"{identificador} a quem administra o sistema."
            )
        },
        headers={HEADER_REQUEST_ID: identificador},
    )


def _limpar_evento(evento: dict, _hint: dict) -> dict | None:
    """Tira do evento o que não deve sair do servidor.

    O `send_default_pii=False` do SDK já evita a maior parte, mas cabeçalho de autorização e
    cookie são o que transformaria um relato de erro em vazamento de sessão — então são
    removidos aqui explicitamente, em vez de depender do padrão continuar sendo esse.
    """
    requisicao = evento.get("request")
    if isinstance(requisicao, dict):
        requisicao.pop("data", None)
        requisicao.pop("cookies", None)
        cabecalhos = requisicao.get("headers")
        if isinstance(cabecalhos, dict):
            for nome in list(cabecalhos):
                if nome.lower() in {"authorization", "cookie", "set-cookie"}:
                    cabecalhos.pop(nome)
    return evento


def inicializar_sentry() -> bool:
    """Liga o relato externo quando há DSN configurado. Devolve se ligou.

    Importado aqui dentro, e não no topo: sem DSN o pacote nem é carregado, e a suíte de testes
    não depende dele.
    """
    if not settings.SENTRY_DSN:
        logger.info(
            "SENTRY_DSN não configurado: erros ficam apenas no log do servidor (ambiente=%s)",
            settings.ENVIRONMENT,
        )
        return False

    try:
        import sentry_sdk
    except ImportError:
        # Falha de configuração não deve impedir a aplicação de subir: sem monitoramento o
        # sistema atende; sem subir, não atende ninguém.
        logger.error("SENTRY_DSN configurado, mas o pacote sentry-sdk não está instalado.")
        return False

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        # Nada de dado pessoal por padrão, e corpo de requisição nunca: um POST de cadastro
        # levaria CPF e endereço para fora junto com o erro.
        send_default_pii=False,
        max_request_body_size="never",
        before_send=_limpar_evento,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )
    logger.info("Sentry inicializado para o ambiente '%s'", settings.ENVIRONMENT)
    return True


def configurar_monitoramento(app: FastAPI) -> None:
    """Chamado uma vez, na criação da aplicação (ver app/main.py)."""
    configurar_logging()
    inicializar_sentry()
    app.add_middleware(RequestIdMiddleware)
    app.add_exception_handler(Exception, _tratar_erro_nao_previsto)
