
from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Telefone(Base):
    __tablename__ = "telefones"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    pessoa_id: Mapped[int] = mapped_column(
        BigInteger,
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
