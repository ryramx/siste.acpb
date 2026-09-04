from decimal import Decimal
from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Projeto(Base):
    __tablename__ = "projetos"

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

    data_inicio: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    data_fim: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    responsavel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    orcamento: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    local: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    objetivos: Mapped[str | None] = mapped_column(
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
