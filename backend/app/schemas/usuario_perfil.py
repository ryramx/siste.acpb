from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UsuarioPerfilBase(BaseModel):
    usuario_id: int
    perfil_id: int

class UsuarioPerfilCreate(UsuarioPerfilBase):
    pass

class UsuarioPerfilUpdate(BaseModel):
    usuario_id: int | None = None
    perfil_id: int | None = None

class UsuarioPerfilResponse(UsuarioPerfilBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
