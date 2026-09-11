from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.perfil import Perfil


class UsuarioPerfil(Base):
    __tablename__ = "usuario_perfis"
    __table_args__ = (
        UniqueConstraint("usuario_id", "perfil_id", name="uq_usuario_perfil"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    usuario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuarios.id"),
        nullable=False
    )

    perfil_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("perfis.id"),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    usuario: Mapped["Usuario"] = relationship()
    perfil: Mapped["Perfil"] = relationship()
