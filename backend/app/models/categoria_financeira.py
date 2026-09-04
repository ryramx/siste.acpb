from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoriaFinanceira(Base):
    __tablename__ = "categorias_financeiras"

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
        String(20),
        nullable=False
    )

    descricao: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
