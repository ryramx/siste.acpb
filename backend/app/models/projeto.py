from decimal import Decimal
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.pessoa import Pessoa
    from app.models.evento import Evento
    from app.models.movimentacao_financeira import MovimentacaoFinanceira
    from app.models.projeto_beneficiario import ProjetoBeneficiario
    from app.models.projeto_voluntario import ProjetoVoluntario


class Projeto(Base, TimestampMixin):
    __tablename__ = "projetos"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    nome: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    descricao: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    data_inicio: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    data_fim: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    responsavel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=True
    )

    orcamento: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True
    )

    local: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    objetivos: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    responsavel: Mapped["Pessoa | None"] = relationship()
    eventos: Mapped[list["Evento"]] = relationship(back_populates="projeto")
    movimentacoes_financeiras: Mapped[list["MovimentacaoFinanceira"]] = relationship(
        back_populates="projeto"
    )
    voluntarios_vinculados: Mapped[list["ProjetoVoluntario"]] = relationship(
        back_populates="projeto"
    )
    beneficiarios_vinculados: Mapped[list["ProjetoBeneficiario"]] = relationship(
        back_populates="projeto"
    )
