from typing import Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditoriaBase(BaseModel):
    usuario_id: int | None = None
    acao: str
    tabela: str | None = None
    registro_id: int | None = None
    descricao: str | None = None
    dados_anteriores: dict | None = None
    dados_novos: dict | None = None
    ip: str | None = None

class AuditoriaCreate(AuditoriaBase):
    pass

class AuditoriaUpdate(BaseModel):
    usuario_id: int | None = None
    acao: str | None = None
    tabela: str | None = None
    registro_id: int | None = None
    descricao: str | None = None
    dados_anteriores: dict | None = None
    dados_novos: dict | None = None
    ip: str | None = None

class AuditoriaResponse(AuditoriaBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
