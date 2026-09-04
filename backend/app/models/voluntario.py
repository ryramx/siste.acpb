from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Voluntario(Base):
    __tablename__ = "voluntarios"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
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
        String,
        nullable=True
    )

    disponibilidade: Mapped[str | None] = mapped_column(
        String,
        nullable=True
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
