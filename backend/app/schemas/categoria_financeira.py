from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CategoriaFinanceiraBase(BaseModel):
    nome: str
    tipo: str
    descricao: str | None = None
    ativo: bool

class CategoriaFinanceiraCreate(CategoriaFinanceiraBase):
    pass

class CategoriaFinanceiraUpdate(BaseModel):
    nome: str | None = None
    tipo: str | None = None
    descricao: str | None = None
    ativo: bool | None = None

class CategoriaFinanceiraResponse(CategoriaFinanceiraBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
