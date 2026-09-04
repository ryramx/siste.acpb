from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CargoBase(BaseModel):
    nome: str
    descricao: str | None = None
    ativo: bool

class CargoCreate(CargoBase):
    pass

class CargoUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    ativo: bool | None = None

class CargoResponse(CargoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
