from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy.dialects.postgresql import JSONB

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    usuario_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("usuarios.id"),
        nullable=True
    )

    acao: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    tabela: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    registro_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    descricao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    dados_anteriores: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    dados_novos: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True
    )

    ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    usuario: Mapped["Usuario | None"] = relationship()
