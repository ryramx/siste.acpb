from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ContaFinanceiraBase(BaseModel):
    nome: str
    tipo: str
    banco: str | None = None
    agencia: str | None = None
    numero_conta: str | None = None
    saldo_inicial: Decimal
    ativo: bool
    observacoes: str | None = None

class ContaFinanceiraCreate(ContaFinanceiraBase):
    pass

class ContaFinanceiraUpdate(BaseModel):
    nome: str | None = None
    tipo: str | None = None
    banco: str | None = None
    agencia: str | None = None
    numero_conta: str | None = None
    saldo_inicial: Decimal | None = None
    ativo: bool | None = None
    observacoes: str | None = None

class ContaFinanceiraResponse(ContaFinanceiraBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
