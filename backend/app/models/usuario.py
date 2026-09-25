from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.perfil import Perfil


class Usuario(Base, TimestampMixin):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        unique=True,
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False
    )

    senha_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    # Conta principal do sistema (a do dono). Só ela mesma pode se alterar: ninguém mais a
    # desativa, troca o e-mail, redefine a senha ou tira o perfil de Administrador. É marcada
    # por scripts/proteger_conta.py, nunca pela API — ver a migration a3c8e61f2b90.
    protegido: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false"
    )

    ultimo_login: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="usuario")
    perfis: Mapped[list["Perfil"]] = relationship(
        secondary="usuario_perfis", back_populates="usuarios", viewonly=True
    )
