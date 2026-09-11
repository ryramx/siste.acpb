from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario
    from app.models.permissao import Permissao


class Perfil(Base):
    __tablename__ = "perfis"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    nome: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    descricao: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary="usuario_perfis", back_populates="perfis", viewonly=True
    )
    permissoes: Mapped[list["Permissao"]] = relationship(
        secondary="perfil_permissoes", back_populates="perfis", viewonly=True
    )
