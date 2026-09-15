from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.projeto_voluntario import ProjetoVoluntario


class Voluntario(Base, TimestampMixin):
    __tablename__ = "voluntarios"

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

    data_inicio: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    data_fim: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    area: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    habilidades: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    disponibilidade: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="voluntario")
    projetos_vinculados: Mapped[list["ProjetoVoluntario"]] = relationship(
        back_populates="voluntario"
    )
