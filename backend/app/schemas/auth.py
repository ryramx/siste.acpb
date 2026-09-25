from pydantic import BaseModel, Field

from app.core.security import SENHA_TAMANHO_MINIMO


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
    senha_nova: str = Field(min_length=SENHA_TAMANHO_MINIMO)


class AlterarSenhaRequest(BaseModel):
    """Troca da própria senha, com o usuário logado.

    Exige a senha atual: sem isso, um token vazado (ou um celular emprestado desbloqueado)
    permitiria trocar a senha e tomar a conta em definitivo, sem precisar conhecê-la.
    """

    senha_atual: str
    # Mesmo mínimo da redefinição por e-mail — não faria sentido a senha escolhida aqui poder
    # ser mais fraca do que a escolhida lá.
    senha_nova: str = Field(min_length=SENHA_TAMANHO_MINIMO)


class MeResponse(BaseModel):
    id: int
    pessoa_id: int
    email: str
    nome_completo: str
    tem_foto: bool
    perfis: list[str]
    permissoes: list[str]
