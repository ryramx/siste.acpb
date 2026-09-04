from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PermissaoBase(BaseModel):
    nome: str
    descricao: str | None = None
    modulo: str
    acao: str
    ativo: bool

class PermissaoCreate(PermissaoBase):
    pass

class PermissaoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    modulo: str | None = None
    acao: str | None = None
    ativo: bool | None = None

class PermissaoResponse(PermissaoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
