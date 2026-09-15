from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.perfil import Perfil


class Permissao(Base, TimestampMixin):
    __tablename__ = "permissoes"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    nome: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    descricao: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    modulo: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    acao: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    perfis: Mapped[list["Perfil"]] = relationship(
        secondary="perfil_permissoes", back_populates="permissoes", viewonly=True
    )
