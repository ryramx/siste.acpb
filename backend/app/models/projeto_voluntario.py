from datetime import datetime
from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProjetoVoluntario(Base):
    __tablename__ = "projeto_voluntarios"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    projeto_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    voluntario_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    funcao: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    data_entrada: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    data_saida: Mapped[date | None] = mapped_column(
        Date,
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
