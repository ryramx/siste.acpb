from decimal import Decimal
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa


class Patrimonio(Base, TimestampMixin):
    """Bem pertencente à associação (tarefa 23): computadores, móveis, instrumentos, etc."""

    __tablename__ = "patrimonios"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    # Código de tombamento/etiqueta. Único para que o mesmo bem não seja cadastrado duas vezes —
    # é por ele que a associação identifica o bem fisicamente.
    codigo: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )

    nome: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    categoria: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    data_aquisicao: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    valor_aquisicao: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    local: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    # Pessoa responsável pela guarda do bem. Nullable e sem ondelete em cascata: excluir uma
    # pessoa não pode apagar o registro do patrimônio.
    responsavel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    responsavel: Mapped["Pessoa | None"] = relationship()
