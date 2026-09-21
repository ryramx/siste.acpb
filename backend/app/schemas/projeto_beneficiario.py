from datetime import date
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProjetoBeneficiarioBase(BaseModel):
    projeto_id: int
    beneficiario_id: int
    papel: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

class ProjetoBeneficiarioCreate(ProjetoBeneficiarioBase):
    pass

class ProjetoBeneficiarioVinculo(BaseModel):
    """Corpo do POST /projetos/{id}/beneficiarios — o projeto vem da URL, não do corpo."""
    beneficiario_id: int
    papel: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

class ProjetoBeneficiarioUpdate(BaseModel):
    papel: str | None = None
    data_entrada: date | None = None
    data_saida: date | None = None
    observacoes: str | None = None

class ProjetoBeneficiarioResponse(ProjetoBeneficiarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    # Denormalizado na rota — mesma razão do schema de voluntários.
    pessoa_id: int | None = None
    pessoa_nome: str | None = None

    model_config = ConfigDict(from_attributes=True)
