from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator

# Lista fechada para manter o acompanhamento consistente — o relatório e os filtros dependem
# de o status ser previsível, ao contrário de projetos, onde o status é texto livre.
STATUS_VALIDOS = {"ATIVO", "EM_MANUTENCAO", "BAIXADO", "EMPRESTADO"}


def _normalizar_status(valor: str) -> str:
    normalizado = valor.strip().upper()
    if normalizado not in STATUS_VALIDOS:
        raise ValueError(f"status deve ser um de: {', '.join(sorted(STATUS_VALIDOS))}")
    return normalizado


def _validar_valor_nao_negativo(valor: Decimal | None) -> Decimal | None:
    if valor is not None and valor < 0:
        raise ValueError("valor_aquisicao não pode ser negativo")
    return valor


class PatrimonioBase(BaseModel):
    codigo: str
    nome: str
    categoria: str
    data_aquisicao: date | None = None
    valor_aquisicao: Decimal | None = None
    local: str | None = None
    responsavel_id: int | None = None
    status: str = "ATIVO"
    observacoes: str | None = None

    @field_validator("status")
    @classmethod
    def validar_status(cls, valor: str) -> str:
        return _normalizar_status(valor)

    @field_validator("codigo")
    @classmethod
    def validar_codigo(cls, valor: str) -> str:
        normalizado = valor.strip()
        if not normalizado:
            raise ValueError("codigo não pode ser vazio")
        return normalizado

    @field_validator("valor_aquisicao")
    @classmethod
    def validar_valor(cls, valor: Decimal | None) -> Decimal | None:
        return _validar_valor_nao_negativo(valor)


class PatrimonioCreate(PatrimonioBase):
    pass


class PatrimonioUpdate(BaseModel):
    codigo: str | None = None
    nome: str | None = None
    categoria: str | None = None
    data_aquisicao: date | None = None
    valor_aquisicao: Decimal | None = None
    local: str | None = None
    responsavel_id: int | None = None
    status: str | None = None
    observacoes: str | None = None

    @field_validator("status")
    @classmethod
    def validar_status(cls, valor: str | None) -> str | None:
        # None aqui significa "campo não enviado" (PUT parcial), não um status inválido.
        if valor is None:
            return None
        return _normalizar_status(valor)

    @field_validator("valor_aquisicao")
    @classmethod
    def validar_valor(cls, valor: Decimal | None) -> Decimal | None:
        return _validar_valor_nao_negativo(valor)


class PatrimonioResponse(PatrimonioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
