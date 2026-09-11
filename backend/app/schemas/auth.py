from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    # Texto simples, não EmailStr: o e-mail institucional usa o domínio interno "acpb.local"
    # (não roteável publicamente), que a validação estrita de EmailStr rejeita por ser um
    # domínio de uso especial (RFC 6761) — a checagem real de existência é o login em si.
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class SolicitarRecuperacaoSenhaRequest(BaseModel):
    email: str


class ConfirmarRecuperacaoSenhaRequest(BaseModel):
    token: str
    senha_nova: str = Field(min_length=8)


class MeResponse(BaseModel):
    id: int
    pessoa_id: int
    email: str
    nome_completo: str
    tem_foto: bool
    perfis: list[str]
    permissoes: list[str]
