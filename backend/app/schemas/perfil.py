from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PerfilBase(BaseModel):
    nome: str
    descricao: str | None = None
    ativo: bool

class PerfilCreate(PerfilBase):
    pass

class PerfilUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    ativo: bool | None = None

class PerfilResponse(PerfilBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
