from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict


class AtendimentoBase(BaseModel):
    beneficiario_id: int
    responsavel_id: int
    data_atendimento: date
    hora_atendimento: time | None = None
    tipo: str | None = None
    descricao: str | None = None
    resultado: str | None = None
    observacoes: str | None = None


class AtendimentoCreate(AtendimentoBase):
    pass


class AtendimentoUpdate(BaseModel):
    data_atendimento: date | None = None
    hora_atendimento: time | None = None
    tipo: str | None = None
    descricao: str | None = None
    resultado: str | None = None
    observacoes: str | None = None


class AtendimentoResponse(AtendimentoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
