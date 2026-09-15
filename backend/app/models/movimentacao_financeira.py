from decimal import Decimal
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.conta_financeira import ContaFinanceira
    from app.models.categoria_financeira import CategoriaFinanceira
    from app.models.projeto import Projeto
    from app.models.pessoa import Pessoa


class MovimentacaoFinanceira(Base, TimestampMixin):
    __tablename__ = "movimentacoes_financeiras"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    conta_financeira_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("contas_financeiras.id"),
        nullable=False
    )

    categoria_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("categorias_financeiras.id"),
        nullable=False
    )

    projeto_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("projetos.id"),
        nullable=True
    )

    responsavel_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("pessoas.id"),
        nullable=False
    )

    tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    descricao: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    valor: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )

    data_movimentacao: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    forma_pagamento: Mapped[str | None] = mapped_column(
        String(30),
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

    conta_financeira: Mapped["ContaFinanceira"] = relationship(
        back_populates="movimentacoes"
    )
    categoria: Mapped["CategoriaFinanceira"] = relationship(
        back_populates="movimentacoes"
    )
    projeto: Mapped["Projeto | None"] = relationship(
        back_populates="movimentacoes_financeiras"
    )
    responsavel: Mapped["Pessoa"] = relationship()
