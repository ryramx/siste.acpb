from datetime import date
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProjetoVoluntarioBase(BaseModel):
    projeto_id: int
    voluntario_id: int
    funcao: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

class ProjetoVoluntarioCreate(ProjetoVoluntarioBase):
    pass

class ProjetoVoluntarioUpdate(BaseModel):
    projeto_id: int | None = None
    voluntario_id: int | None = None
    funcao: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

class ProjetoVoluntarioResponse(ProjetoVoluntarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
