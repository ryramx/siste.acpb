from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa


class Telefone(Base):
    __tablename__ = "telefones"
    __table_args__ = (
        Index(
            "ix_telefones_pessoa_principal_unico",
            "pessoa_id",
            unique=True,
            postgresql_where=text("principal = true"),
        ),
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

    numero: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    principal: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    whatsapp: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    pessoa: Mapped["Pessoa"] = relationship(back_populates="telefones")
