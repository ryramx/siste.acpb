from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PerfilPermissaoBase(BaseModel):
    perfil_id: int
    permissao_id: int

class PerfilPermissaoCreate(PerfilPermissaoBase):
    pass

class PerfilPermissaoUpdate(BaseModel):
    perfil_id: int | None = None
    permissao_id: int | None = None

class PerfilPermissaoResponse(PerfilPermissaoBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
