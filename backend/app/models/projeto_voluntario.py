from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.projeto import Projeto
    from app.models.voluntario import Voluntario


class ProjetoVoluntario(Base, TimestampMixin):
    __tablename__ = "projeto_voluntarios"
    __table_args__ = (
        UniqueConstraint("projeto_id", "voluntario_id", name="uq_projeto_voluntario"),
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

    voluntario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("voluntarios.id"),
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
        Text,
        nullable=True
    )

    projeto: Mapped["Projeto"] = relationship(back_populates="voluntarios_vinculados")
    voluntario: Mapped["Voluntario"] = relationship(back_populates="projetos_vinculados")
