from datetime import date
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict

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
    pass

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

class MovimentacaoFinanceiraResponse(MovimentacaoFinanceiraBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
