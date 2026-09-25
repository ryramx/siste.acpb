import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Mínimo de caracteres de qualquer senha, em todos os caminhos (criar usuário, trocar, redefinir,
# recuperar e o script do primeiro admin). O frontend repete o valor só para avisar antes.
SENHA_TAMANHO_MINIMO = 5

_password_hash = PasswordHash.recommended()


def hash_password(senha: str) -> str:
    return _password_hash.hash(senha)


def verify_password(senha: str, senha_hash: str) -> bool:
    return _password_hash.verify(senha, senha_hash)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expira_em = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else settings.JWT_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expira_em}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


class TokenInvalido(Exception):
    pass


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenInvalido() from exc


def generate_reset_token() -> tuple[str, str]:
    """Gera um token de uso único para recuperação de senha. Retorna (token_bruto, hash_sha256).
    Apenas o hash é persistido — o token bruto é enviado ao usuário (e-mail/log) e não pode ser
    recuperado a partir do banco."""
    token_bruto = secrets.token_urlsafe(32)
    return token_bruto, hash_reset_token(token_bruto)


def hash_reset_token(token_bruto: str) -> str:
    return hashlib.sha256(token_bruto.encode("utf-8")).hexdigest()
