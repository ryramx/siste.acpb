from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class SenhaResetToken(Base):
    __tablename__ = "senha_reset_tokens"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)

    usuario_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("usuarios.id"), nullable=False
    )

    # Armazena apenas o hash SHA-256 do token — o valor em texto puro é enviado ao usuário
    # (e-mail/log) e nunca persistido, para que um vazamento do banco não permita reset de senha.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    usado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    usuario: Mapped["Usuario"] = relationship()
