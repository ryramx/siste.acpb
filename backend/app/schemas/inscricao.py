from datetime import datetime
from pydantic import BaseModel, ConfigDict

class InscricaoBase(BaseModel):
    pessoa_id: int
    evento_id: int
    data_inscricao: datetime
    status: str
    observacoes: str | None = None

class InscricaoCreate(InscricaoBase):
    pass

class InscricaoUpdate(BaseModel):
    pessoa_id: int | None = None
    evento_id: int | None = None
    data_inscricao: datetime | None = None
    status: str | None = None
    observacoes: str | None = None

class InscricaoResponse(InscricaoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
