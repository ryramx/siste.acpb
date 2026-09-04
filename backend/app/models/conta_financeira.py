from decimal import Decimal
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContaFinanceira(Base):
    __tablename__ = "contas_financeiras"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    nome: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    banco: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    agencia: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    numero_conta: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    saldo_inicial: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
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
