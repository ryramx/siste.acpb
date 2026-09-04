from decimal import Decimal
from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Beneficiario(Base):
    __tablename__ = "beneficiarios"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    data_cadastro: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    situacao_socioeconomica: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    composicao_familiar: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    renda_familiar: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    tamanho_familia: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    necessidades: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    observacoes: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    data_encerramento: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    motivo_encerramento: Mapped[str | None] = mapped_column(
        String(255),
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
