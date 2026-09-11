import re

from pydantic import BaseModel, ConfigDict, field_validator

TIPOS_VALIDOS = {"CELULAR", "FIXO", "COMERCIAL", "OUTRO"}


def _validar_numero(numero: str) -> str:
    apenas_digitos = re.sub(r"\D", "", numero)
    if len(apenas_digitos) not in (10, 11):
        raise ValueError(
            "Telefone deve ter 10 ou 11 dígitos (DDD + número), com ou sem formatação"
        )
    return apenas_digitos


class TelefoneBase(BaseModel):
    pessoa_id: int
    numero: str
    tipo: str
    principal: bool = False
    whatsapp: bool = False

    @field_validator("numero")
    @classmethod
    def validar_numero(cls, v: str) -> str:
        return _validar_numero(v)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo deve ser um de: {', '.join(sorted(TIPOS_VALIDOS))}")
        return v_upper


class TelefoneCreate(TelefoneBase):
    pass


class TelefoneUpdate(BaseModel):
    numero: str | None = None
    tipo: str | None = None
    principal: bool | None = None
    whatsapp: bool | None = None

    @field_validator("numero")
    @classmethod
    def validar_numero(cls, v: str | None) -> str | None:
        return _validar_numero(v) if v is not None else v

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v_upper = v.upper()
        if v_upper not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo deve ser um de: {', '.join(sorted(TIPOS_VALIDOS))}")
        return v_upper


class TelefoneResponse(TelefoneBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
