from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Inscricao(Base):
    __tablename__ = "inscricoes"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    evento_id: Mapped[int] = mapped_column(
        BigInteger,
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
