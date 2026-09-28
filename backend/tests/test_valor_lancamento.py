"""Limites do valor de um lançamento (RQ-01 da rodada de QA de 25/09/2026).

O QA lançou R$ 9.999.999.999,99, o teto da coluna. Um centavo a mais e o banco recusaria com
erro 500; zero ou negativo passavam sem aviso.
"""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.movimentacao_financeira import (
    MovimentacaoFinanceiraCreate,
    MovimentacaoFinanceiraUpdate,
)

BASE = {
    "conta_financeira_id": 1,
    "categoria_id": 1,
    "responsavel_id": 1,
    "tipo": "ENTRADA",
    "descricao": "teste",
    "data_movimentacao": "2026-09-25",
    "status": "CONFIRMADA",
}


@pytest.mark.parametrize("valor", ["0.01", "0.1", "1500", "99999999.99"])
def test_aceita_valores_validos(valor):
    assert MovimentacaoFinanceiraCreate(**BASE, valor=valor).valor == Decimal(valor)


@pytest.mark.parametrize(
    "valor, trecho",
    [
        ("0", "maior que zero"),
        ("-10", "maior que zero"),
        ("100000000.00", "máximo"),
        ("9999999999.99", "máximo"),
        ("10.001", "duas casas"),
    ],
)
def test_recusa_valores_invalidos(valor, trecho):
    with pytest.raises(ValidationError, match=trecho):
        MovimentacaoFinanceiraCreate(**BASE, valor=valor)
    with pytest.raises(ValidationError, match=trecho):
        MovimentacaoFinanceiraUpdate(valor=valor)


def test_edicao_sem_valor_continua_valida():
    assert MovimentacaoFinanceiraUpdate(descricao="outra").valor is None
