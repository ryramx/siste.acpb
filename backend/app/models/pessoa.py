from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Pessoa(Base):
    __tablename__ = "pessoas"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    nome_completo: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    cpf: Mapped[str | None] = mapped_column(
        String(11),
        unique=True,
        nullable=True
    )

    rg: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    data_nascimento: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    sexo: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    estado_civil: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    profissao: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    escolaridade: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    nome_mae: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    nome_pai: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    endereco: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    cidade: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    estado: Mapped[str | None] = mapped_column(
        String(2),
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