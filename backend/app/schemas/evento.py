from datetime import date
from datetime import time
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EventoBase(BaseModel):
    nome: str
    descricao: str | None = None
    data_evento: date
    hora_inicio: time | None = None
    hora_fim: time | None = None
    local: str | None = None
    responsavel_id: int | None = None
    projeto_id: int | None = None
    limite_participantes: int | None = None
    exige_inscricao: bool
    observacoes: str | None = None

class EventoCreate(EventoBase):
    pass

class EventoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    data_evento: date | None = None
    hora_inicio: time | None = None
    hora_fim: time | None = None
    local: str | None = None
    responsavel_id: int | None = None
    projeto_id: int | None = None
    limite_participantes: int | None = None
    exige_inscricao: bool | None = None
    observacoes: str | None = None

class EventoResponse(EventoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
