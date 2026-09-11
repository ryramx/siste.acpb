import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Formato simples (não usamos EmailStr): o e-mail institucional pode usar o domínio interno
# "acpb.local" (não roteável publicamente), que a validação estrita de EmailStr rejeita por ser
# domínio de uso especial (RFC 6761). Ainda validamos o formato básico "algo@algo.algo".
_EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validar_formato_email(v: str) -> str:
    if not _EMAIL_REGEX.match(v):
        raise ValueError("E-mail em formato inválido")
    return v


class UsuarioCreate(BaseModel):
    pessoa_id: int
    email: str
    senha: str = Field(min_length=8)
    ativo: bool = True

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        return _validar_formato_email(v)


class UsuarioUpdate(BaseModel):
    email: str | None = None
    ativo: bool | None = None

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str | None) -> str | None:
        return _validar_formato_email(v) if v is not None else v


class UsuarioAlterarSenha(BaseModel):
    senha_atual: str
    senha_nova: str = Field(min_length=8)


class UsuarioResponse(BaseModel):
    id: int
    pessoa_id: int
    email: str
    ativo: bool
    ultimo_login: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
