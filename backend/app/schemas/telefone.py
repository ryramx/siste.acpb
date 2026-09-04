from pydantic import BaseModel, ConfigDict

class TelefoneBase(BaseModel):
    pessoa_id: int
    numero: str
    tipo: str
    principal: bool
    whatsapp: bool

class TelefoneCreate(TelefoneBase):
    pass

class TelefoneUpdate(BaseModel):
    pessoa_id: int | None = None
    numero: str | None = None
    tipo: str | None = None
    principal: bool | None = None
    whatsapp: bool | None = None

class TelefoneResponse(TelefoneBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
