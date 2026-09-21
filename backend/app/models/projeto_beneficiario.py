from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.beneficiario import Beneficiario
    from app.models.projeto import Projeto


class ProjetoBeneficiario(Base, TimestampMixin):
    __tablename__ = "projeto_beneficiarios"
    __table_args__ = (
        UniqueConstraint("projeto_id", "beneficiario_id", name="uq_projeto_beneficiario"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    projeto_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("projetos.id"),
        nullable=False
    )

    beneficiario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("beneficiarios.id"),
        nullable=False
    )

    # Como o beneficiário participa do projeto (ex.: "Aluno", "Responsável pelo aluno").
    # Espelha `funcao` em projeto_voluntarios.
    papel: Mapped[str | None] = mapped_column(
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
        Text,
        nullable=True
    )

    projeto: Mapped["Projeto"] = relationship(back_populates="beneficiarios_vinculados")
    beneficiario: Mapped["Beneficiario"] = relationship(back_populates="projetos_vinculados")
