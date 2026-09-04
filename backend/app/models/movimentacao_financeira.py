from decimal import Decimal
from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MovimentacaoFinanceira(Base):
    __tablename__ = "movimentacoes_financeiras"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    conta_financeira_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    categoria_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    projeto_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    responsavel_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    descricao: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    valor: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    data_movimentacao: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    forma_pagamento: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
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
