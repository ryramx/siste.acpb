from datetime import date
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class MembroBase(BaseModel):
    pessoa_id: int
    cargo_id: int
    data_entrada: date
    data_saida: date | None = None
    motivo_saida: str | None = None
    ativo: bool
    observacoes: str | None = None

class MembroCreate(MembroBase):
    pass

class MembroUpdate(BaseModel):
    pessoa_id: int | None = None
    cargo_id: int | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    motivo_saida: str | None = None
    ativo: bool | None = None
    observacoes: str | None = None

class MembroResponse(MembroBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
