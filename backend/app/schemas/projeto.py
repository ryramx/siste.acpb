from datetime import date
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProjetoBase(BaseModel):
    nome: str
    descricao: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    status: str
    responsavel_id: int | None = None
    orcamento: Decimal | None = None
    local: str | None = None
    objetivos: str | None = None
    observacoes: str | None = None

class ProjetoCreate(ProjetoBase):
    pass

class ProjetoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    status: str | None = None
    responsavel_id: int | None = None
    orcamento: Decimal | None = None
    local: str | None = None
    objetivos: str | None = None
    observacoes: str | None = None

class ProjetoResponse(ProjetoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
