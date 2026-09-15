from decimal import Decimal
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.atendimento import Atendimento


class Beneficiario(Base, TimestampMixin):
    __tablename__ = "beneficiarios"

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

    data_cadastro: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    situacao_socioeconomica: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    composicao_familiar: Mapped[str | None] = mapped_column(
        Text,
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
        Text,
        nullable=True
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
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

    pessoa: Mapped["Pessoa"] = relationship(back_populates="beneficiario")
    atendimentos: Mapped[list["Atendimento"]] = relationship(back_populates="beneficiario")
