from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Boolean, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Membro(Base):
    __tablename__ = "membros"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    cargo_id: Mapped[int] = mapped_column(
        BigInteger,
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
