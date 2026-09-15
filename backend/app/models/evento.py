from datetime import time
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Date, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.projeto import Projeto
    from app.models.inscricao import Inscricao


class Evento(Base, TimestampMixin):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    nome: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    descricao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    data_evento: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    hora_inicio: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    hora_fim: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    local: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    responsavel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=True
    )

    projeto_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("projetos.id"),
        nullable=True
    )

    limite_participantes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    exige_inscricao: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    responsavel: Mapped["Pessoa | None"] = relationship()
    projeto: Mapped["Projeto | None"] = relationship(back_populates="eventos")
    inscricoes: Mapped[list["Inscricao"]] = relationship(
        back_populates="evento", cascade="all, delete-orphan"
    )
