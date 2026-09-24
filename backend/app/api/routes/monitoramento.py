import logging

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.auditoria import obter_ip_cliente
from app.core.rate_limit import LimiteDeTentativas, exigir_dentro_do_limite
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

router = APIRouter()

# Um erro de tela que se repete vira uma enxurrada de chamadas (um componente que estoura a cada
# render, por exemplo). O limite protege o log de encher e o servidor de ser ocupado por isso;
# perder o segundo relato idêntico não custa nada, porque o primeiro já contou a história.
_limite_por_usuario = LimiteDeTentativas("erro-cliente", maximo=10, janela_segundos=600)


class ErroDeTela(BaseModel):
    """Relato de um erro que quebrou uma tela no navegador.

    Campos curtos de propósito: o que interessa é saber *que* quebrou, onde e para quem, o
    suficiente para reproduzir. Nada aqui deve carregar dado de cadastro.
    """

    mensagem: str = Field(max_length=500)
    caminho: str = Field(max_length=300)
    # Primeiras linhas da pilha do componente React. Truncado no cliente; o limite aqui é a
    # garantia, porque o cliente não é confiável.
    detalhe: str | None = Field(default=None, max_length=2000)


@router.post("/erro-cliente", status_code=status.HTTP_204_NO_CONTENT)
def registrar_erro_de_tela(
    dados: ErroDeTela,
    request: Request,
    usuario_atual: Usuario = Depends(get_current_user),
):
    """Leva ao log do servidor um erro que aconteceu no navegador.

    Sem isto, uma tela que quebra no celular de uma secretária é invisível para quem mantém o
    sistema: o backend responde 200 em tudo, o usuário vê uma tela branca (ou, agora, o aviso do
    `ErrorBoundary`) e ninguém mais fica sabendo. O relato entra no mesmo log que o erro de
    servidor, e vai ao Sentry pelo mesmo caminho quando há DSN configurado.

    Exige usuário autenticado: além de ser onde as telas vivem, isso impede que a rota sirva de
    canal aberto para escrever no log de quem não entrou.
    """
    exigir_dentro_do_limite(
        _limite_por_usuario,
        str(usuario_atual.id),
        "Muitos relatos de erro de tela em pouco tempo.",
    )
    _limite_por_usuario.registrar(str(usuario_atual.id))

    # `%s` com argumentos, nunca f-string: assim o texto vindo do cliente não é interpretado
    # como formato da mensagem de log.
    logger.error(
        "Erro de tela relatado pelo navegador: %s | caminho=%s | usuario_id=%s | ip=%s | %s",
        dados.mensagem,
        dados.caminho,
        usuario_atual.id,
        obter_ip_cliente(request),
        dados.detalhe or "sem detalhe",
    )
    return None
