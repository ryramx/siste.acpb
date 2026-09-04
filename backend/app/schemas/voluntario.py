from datetime import date
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VoluntarioBase(BaseModel):
    pessoa_id: int
    data_inicio: date
    data_fim: date | None = None
    area: str | None = None
    habilidades: str | None = None
    disponibilidade: str | None = None
    observacoes: str | None = None

class VoluntarioCreate(VoluntarioBase):
    pass

class VoluntarioUpdate(BaseModel):
    pessoa_id: int | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    area: str | None = None
    habilidades: str | None = None
    disponibilidade: str | None = None
    observacoes: str | None = None

class VoluntarioResponse(VoluntarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
