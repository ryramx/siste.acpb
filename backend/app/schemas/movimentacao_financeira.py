from datetime import date
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

# Teto de um lançamento: R$ 99.999.999,99. A coluna (NUMERIC(12,2)) aguenta até
# R$ 9.999.999.999,99, mas um valor desses numa associação só aparece por erro de digitação,
# e passando do tamanho da coluna o banco recusaria com um erro 500 em vez de uma mensagem.
# As somas não correm risco: SUM de NUMERIC no Postgres não tem teto.
VALOR_MAXIMO = Decimal("99999999.99")


def _validar_valor(valor: Decimal | None) -> Decimal | None:
    if valor is None:
        return valor
    if valor <= 0:
        raise ValueError("O valor precisa ser maior que zero")
    if valor > VALOR_MAXIMO:
        raise ValueError("O valor passa do máximo de R$ 99.999.999,99 por lançamento")
    if valor != valor.quantize(Decimal("0.01")):
        raise ValueError("O valor aceita no máximo duas casas decimais")
    return valor


class MovimentacaoFinanceiraBase(BaseModel):
    conta_financeira_id: int
    categoria_id: int
    projeto_id: int | None = None
    responsavel_id: int
    tipo: str
    descricao: str
    valor: Decimal
    data_movimentacao: date
    forma_pagamento: str | None = None
    status: str
    observacoes: str | None = None

class MovimentacaoFinanceiraCreate(MovimentacaoFinanceiraBase):
    @field_validator("valor")
    @classmethod
    def validar_valor(cls, v: Decimal) -> Decimal:
        return _validar_valor(v)

class MovimentacaoFinanceiraUpdate(BaseModel):
    conta_financeira_id: int | None = None
    categoria_id: int | None = None
    projeto_id: int | None = None
    responsavel_id: int | None = None
    tipo: str | None = None
    descricao: str | None = None
    valor: Decimal | None = None
    data_movimentacao: date | None = None
    forma_pagamento: str | None = None
    status: str | None = None
    observacoes: str | None = None

    @field_validator("valor")
    @classmethod
    def validar_valor(cls, v: Decimal | None) -> Decimal | None:
        return _validar_valor(v)

class MovimentacaoFinanceiraResponse(MovimentacaoFinanceiraBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
