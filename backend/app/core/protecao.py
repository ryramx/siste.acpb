"""Proteção básica da API contra abuso (RQ-09 da rodada de QA de 25/09/2026).

Três coisas, num middleware só, antes de qualquer rota:

- **Tamanho do corpo.** Requisição maior que `REQUISICAO_TAMANHO_MAXIMO_MB` é recusada com 413
  pelo `Content-Length`, antes de ler o corpo; um corpo sem esse cabeçalho é contado enquanto
  chega. O limite fica acima do maior upload aceito (5 MB de comprovante), que tem o seu
  próprio limite na rota (ver app/core/upload.py).
- **Limite de escrita.** POST, PUT, PATCH e DELETE contam por usuário (pelo token) ou, sem
  token, por IP, numa janela de um minuto. Upload tem um limite mais apertado. Leitura não é
  limitada: algumas telas ainda buscam uma pessoa por linha, e um limite de leitura travaria
  o uso normal. O login e a recuperação de senha têm limites próprios (ver rate_limit.py).
- **Cabeçalhos de segurança** em toda resposta: `nosniff`, sem iframe, sem Referer e, em
  produção, HSTS.

O que depende da infraestrutura está no README, na seção de segurança.
"""

import json
import re

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.rate_limit import LimiteDeTentativas
from app.core.security import TokenInvalido, decode_access_token

_METODOS_DE_ESCRITA = {"POST", "PUT", "PATCH", "DELETE"}

# Login e recuperação de senha já têm limites próprios, mais finos (por e-mail e por IP).
_ROTAS_COM_LIMITE_PROPRIO = re.compile(r"^/auth/")
_ROTAS_DE_UPLOAD = re.compile(r"^/anexos-financeiros/?$|^/pessoas/\d+/foto/?$")

_limite_escrita = LimiteDeTentativas(
    "escrita", maximo=settings.ESCRITAS_POR_MINUTO, janela_segundos=60
)
_limite_upload = LimiteDeTentativas(
    "upload", maximo=settings.UPLOADS_POR_MINUTO, janela_segundos=60
)

_CABECALHOS_DE_SEGURANCA = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
]
_HSTS = (b"strict-transport-security", b"max-age=31536000; includeSubDomains")


def _chave_de_quem_pede(scope, cabecalhos: dict[bytes, bytes]) -> str:
    """O usuário do token, quando há um válido; senão o IP.

    Por usuário, e não só por IP: atrás do proxy do Render todos os usuários podem chegar com
    o mesmo IP (ver README), e um limite só por IP seria um limite da associação inteira.
    """
    autorizacao = cabecalhos.get(b"authorization", b"").decode("latin-1")
    if autorizacao.lower().startswith("bearer "):
        try:
            sub = decode_access_token(autorizacao[7:].strip()).get("sub")
            if sub is not None:
                return f"usuario:{sub}"
        except TokenInvalido:
            pass
    cliente = scope.get("client")
    return f"ip:{cliente[0] if cliente else 'desconhecido'}"


async def _responder_erro(send, codigo: int, detalhe: str, extras: list[tuple[bytes, bytes]] = ()):
    corpo = json.dumps({"detail": detalhe}, ensure_ascii=False).encode()
    await send({
        "type": "http.response.start",
        "status": codigo,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(corpo)).encode()),
            *_CABECALHOS_DE_SEGURANCA,
            *extras,
        ],
    })
    await send({"type": "http.response.body", "body": corpo})


class ProtecaoDaApi:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        cabecalhos = {k.lower(): v for k, v in scope.get("headers", [])}
        limite_bytes = settings.REQUISICAO_TAMANHO_MAXIMO_MB * 1024 * 1024
        mensagem_tamanho = (
            f"A requisição passa do tamanho máximo de {settings.REQUISICAO_TAMANHO_MAXIMO_MB}MB"
        )

        tamanho_declarado = cabecalhos.get(b"content-length")
        if tamanho_declarado and tamanho_declarado.isdigit() and int(tamanho_declarado) > limite_bytes:
            await _responder_erro(send, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, mensagem_tamanho)
            return

        caminho = scope.get("path", "")
        if scope["method"] in _METODOS_DE_ESCRITA and not _ROTAS_COM_LIMITE_PROPRIO.match(caminho):
            limite = _limite_upload if _ROTAS_DE_UPLOAD.match(caminho) else _limite_escrita
            chave = _chave_de_quem_pede(scope, cabecalhos)
            espera = limite.segundos_de_espera(chave)
            if espera is not None:
                await _responder_erro(
                    send,
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "Muitas alterações em pouco tempo. Aguarde um instante e tente de novo.",
                    [(b"retry-after", str(espera).encode())],
                )
                return
            limite.registrar(chave)

        recebido = 0

        async def receber_com_limite():
            nonlocal recebido
            mensagem = await receive()
            if mensagem["type"] == "http.request":
                recebido += len(mensagem.get("body", b""))
                if recebido > limite_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=mensagem_tamanho,
                    )
            return mensagem

        em_producao = settings.ENVIRONMENT == "production"

        async def enviar_com_cabecalhos(mensagem):
            if mensagem["type"] == "http.response.start":
                existentes = {k.lower() for k, _ in mensagem.get("headers", [])}
                extras = [c for c in _CABECALHOS_DE_SEGURANCA if c[0] not in existentes]
                if em_producao and _HSTS[0] not in existentes:
                    extras.append(_HSTS)
                mensagem = {**mensagem, "headers": [*mensagem.get("headers", []), *extras]}
            await send(mensagem)

        await self.app(scope, receber_com_limite, enviar_com_cabecalhos)
