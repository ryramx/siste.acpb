"""Validação de nome de gente (RQ-06 da rodada de QA de 25/09/2026).

O cadastro aceitava "123123123" como nome completo de um membro. Vale para o nome da pessoa e
para os nomes de mãe, pai e responsável legal, que também são nomes de gente. Não vale para
nome de bem, categoria, conta ou descrição: "Notebook 2" é um nome legítimo de patrimônio.

Aceita letras (com acento), espaço, hífen e apóstrofo: "Maria d'Ávila-Souza".
"""

import re

TAMANHO_MINIMO = 3

# Letras latinas com acento; cada palavra separada por espaço, hífen ou apóstrofo (reto ou
# tipográfico, que vem de quem cola o nome de um documento).
_LETRAS = r"A-Za-zÀ-ÖØ-öø-ÿ"
_NOME = re.compile(rf"^[{_LETRAS}]+(?:(?: |-|'|’| '|' )[{_LETRAS}]+)*$")


def normalizar_nome_pessoa(valor: str, campo: str = "O nome") -> str:
    """Tira espaços das pontas e repetidos no meio; recusa número e símbolo."""
    nome = re.sub(r"\s+", " ", valor).strip()
    if len(nome) < TAMANHO_MINIMO:
        raise ValueError(f"{campo} precisa ter ao menos {TAMANHO_MINIMO} letras")
    if not _NOME.match(nome):
        raise ValueError(
            f"{campo} só pode ter letras, espaço, hífen e apóstrofo (sem números ou símbolos)"
        )
    return nome


def normalizar_nome_opcional(valor: str | None, campo: str) -> str | None:
    """Para campos que podem ficar em branco: branco passa como veio."""
    if valor is None or not valor.strip():
        return valor
    return normalizar_nome_pessoa(valor, campo)
