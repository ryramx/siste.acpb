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

class ProjetoVoluntarioVinculo(BaseModel):
    """Corpo do POST /projetos/{id}/voluntarios — o projeto vem da URL, não do corpo."""
    voluntario_id: int
    funcao: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

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

    # Denormalizado na rota (como em dashboard.py): sem isto, listar a equipe de um projeto
    # obrigaria o frontend a buscar /voluntarios/{id} e /pessoas/{id} por linha.
    pessoa_id: int | None = None
    pessoa_nome: str | None = None
    area: str | None = None

    model_config = ConfigDict(from_attributes=True)
