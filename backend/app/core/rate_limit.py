"""Limite de tentativas nas rotas públicas de autenticação.

**Por que existe.** `/auth/login` e `/auth/recuperar-senha` são as únicas rotas que respondem
sem token (ver `AUTENTICACAO.md`). Sem limite nenhum:

- uma senha fraca cai por força bruta — o sistema guarda CPF e dados socioeconômicos de
  beneficiários, então a conta de qualquer usuário é um caminho para dado pessoal sensível;
- `/auth/recuperar-senha` serve para inundar a caixa de um usuário e, pior, para queimar a
  cota diária do provedor de e-mail (300 mensagens/dia na Brevo — ver `DEPLOY.md`), o que
  derruba a recuperação de senha de *todos* os usuários até o dia seguinte.

**Como funciona.** Janela deslizante em memória: cada chave (um IP, ou um e-mail) guarda os
instantes das tentativas recentes. Passar do máximo dentro da janela responde 429 com o
header `Retry-After`.

**Limitação conhecida, aceita de propósito.** O estado é do processo, não compartilhado:

- com mais de um worker (`uvicorn --workers N`, citado em `DEPLOY.md` para servidor próprio),
  o limite efetivo é multiplicado pelo número de workers, porque cada um conta o seu;
- um redeploy ou o retorno da hibernação zera os contadores.

Em produção hoje a API roda em um único processo no Render, então o limite vale como escrito.
Nenhuma das duas ressalvas ajuda um atacante de verdade — ele não reinicia o servidor —, e a
alternativa (contador no banco ou no Redis) custa uma escrita por tentativa, que é exatamente
o que um ataque de força bruta produz em volume. Se algum dia houver mais de um worker, o
caminho é mover este contador para um armazenamento compartilhado, mantendo esta interface.
"""

import threading
import time

from fastapi import HTTPException, status

# Acima deste número de chaves distintas, uma poda completa roda antes de registrar a próxima
# tentativa. Existe só para o dicionário não crescer sem limite quando alguém varre a rota com
# e-mails inventados — o uso normal fica muito abaixo disso.
_LIMITE_DE_CHAVES_ANTES_DA_PODA = 5_000


class LimiteDeTentativas:
    """Conta tentativas por chave dentro de uma janela de tempo.

    `maximo` é o número de tentativas permitidas na janela: a de número `maximo + 1` é
    recusada.
    """

    def __init__(self, nome: str, maximo: int, janela_segundos: int) -> None:
        self.nome = nome
        self.maximo = maximo
        self.janela_segundos = janela_segundos
        self._tentativas: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        _registrados.append(self)

    def _podar(self, chave: str, agora: float) -> list[float]:
        """Descarta as tentativas que já saíram da janela. Exige o lock."""
        recentes = [
            momento
            for momento in self._tentativas.get(chave, ())
            if agora - momento < self.janela_segundos
        ]
        if recentes:
            self._tentativas[chave] = recentes
        else:
            self._tentativas.pop(chave, None)
        return recentes

    def _podar_tudo(self, agora: float) -> None:
        """Exige o lock."""
        for chave in list(self._tentativas):
            self._podar(chave, agora)

    def segundos_de_espera(self, chave: str) -> int | None:
        """`None` quando a chave ainda pode tentar; senão, quantos segundos faltam para a
        tentativa mais antiga sair da janela e liberar uma vaga."""
        agora = time.monotonic()
        with self._lock:
            recentes = self._podar(chave, agora)
            if len(recentes) < self.maximo:
                return None
            espera = self.janela_segundos - (agora - min(recentes))
            # Arredonda para cima: devolver 0 faria o cliente tentar de novo e levar 429 outra
            # vez, no mesmo instante.
            return max(1, int(espera) + 1)

    def registrar(self, chave: str) -> None:
        agora = time.monotonic()
        with self._lock:
            if len(self._tentativas) > _LIMITE_DE_CHAVES_ANTES_DA_PODA:
                self._podar_tudo(agora)
            self._tentativas.setdefault(chave, []).append(agora)

    def limpar(self, chave: str) -> None:
        """Zera a contagem de uma chave — usado quando o login dá certo: quem acertou a senha
        não deve pagar pelas tentativas erradas que fez antes."""
        with self._lock:
            self._tentativas.pop(chave, None)

    def limpar_tudo(self) -> None:
        with self._lock:
            self._tentativas.clear()


_registrados: list[LimiteDeTentativas] = []


def limpar_todos_os_limites() -> None:
    """Zera todos os contadores. Usado pela suíte de testes entre casos (ver
    `backend/conftest.py`), para que um teste que erra a senha de propósito não deixe o
    seguinte esbarrando no 429."""
    for limite in _registrados:
        limite.limpar_tudo()


def chave_de_email(email: str) -> str:
    """E-mail normalizado. Sem isto, `Maria@x.com` e `maria@x.com` seriam duas cotas para a
    mesma conta — e o login não diferencia maiúsculas no domínio."""
    return email.strip().lower()


def exigir_dentro_do_limite(limite: LimiteDeTentativas, chave: str, mensagem: str) -> None:
    """Recusa com 429 quando a chave passou do limite. `Retry-After` em segundos, como manda
    a RFC 9110 — é o que diz ao cliente (e a um proxy) quando faz sentido tentar de novo."""
    espera = limite.segundos_de_espera(chave)
    if espera is None:
        return
    minutos = max(1, round(espera / 60))
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"{mensagem} Tente novamente em {minutos} minuto(s).",
        headers={"Retry-After": str(espera)},
    )
