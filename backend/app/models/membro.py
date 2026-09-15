from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.cargo import Cargo


class Membro(Base, TimestampMixin):
    __tablename__ = "membros"

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

    cargo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cargos.id"),
        nullable=False
    )

    data_entrada: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    data_saida: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    motivo_saida: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="membro")
    cargo: Mapped["Cargo"] = relationship(back_populates="membros")
