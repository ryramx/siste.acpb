from datetime import time
from datetime import date
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Evento(Base):
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
        String,
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
        nullable=True
    )

    projeto_id: Mapped[int | None] = mapped_column(
        BigInteger,
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
        String,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
