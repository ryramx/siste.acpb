from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.evento import Evento


class Inscricao(Base):
    __tablename__ = "inscricoes"
    __table_args__ = (
        UniqueConstraint("pessoa_id", "evento_id", name="uq_inscricao_pessoa_evento"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=False
    )

    evento_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("eventos.id"),
        nullable=False
    )

    data_inscricao: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
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

    pessoa: Mapped["Pessoa"] = relationship()
    evento: Mapped["Evento"] = relationship(back_populates="inscricoes")
