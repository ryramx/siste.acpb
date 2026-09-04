from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UsuarioBase(BaseModel):
    pessoa_id: int
    email: str
    senha_hash: str
    ativo: bool
    ultimo_login: datetime | None = None

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioUpdate(BaseModel):
    pessoa_id: int | None = None
    email: str | None = None
    senha_hash: str | None = None
    ativo: bool | None = None
    ultimo_login: datetime | None = None

class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
