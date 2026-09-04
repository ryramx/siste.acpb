from datetime import date
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BeneficiarioBase(BaseModel):
    pessoa_id: int
    data_cadastro: date
    situacao_socioeconomica: str | None = None
    composicao_familiar: str | None = None
    renda_familiar: Decimal | None = None
    tamanho_familia: int | None = None
    necessidades: str | None = None
    observacoes: str | None = None
    data_encerramento: date | None = None
    motivo_encerramento: str | None = None

class BeneficiarioCreate(BeneficiarioBase):
    pass

class BeneficiarioUpdate(BaseModel):
    pessoa_id: int | None = None
    data_cadastro: date | None = None
    situacao_socioeconomica: str | None = None
    composicao_familiar: str | None = None
    renda_familiar: Decimal | None = None
    tamanho_familia: int | None = None
    necessidades: str | None = None
    observacoes: str | None = None
    data_encerramento: date | None = None
    motivo_encerramento: str | None = None

class BeneficiarioResponse(BeneficiarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
