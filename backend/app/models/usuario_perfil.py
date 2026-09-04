from datetime import datetime

from sqlalchemy import BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UsuarioPerfil(Base):
    __tablename__ = "usuario_perfis"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    usuario_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    perfil_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
