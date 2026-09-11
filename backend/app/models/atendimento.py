from datetime import datetime
from datetime import date
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.beneficiario import Beneficiario
    from app.models.pessoa import Pessoa


class Atendimento(Base):
    __tablename__ = "atendimentos"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    beneficiario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("beneficiarios.id"),
        nullable=False
    )

    responsavel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=False
    )

    data_atendimento: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    hora_atendimento: Mapped[time | None] = mapped_column(
        Time,
        nullable=True
    )

    tipo: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    descricao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    resultado: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
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

    beneficiario: Mapped["Beneficiario"] = relationship(back_populates="atendimentos")
    responsavel: Mapped["Pessoa"] = relationship()
