from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.membro import Membro
    from app.models.voluntario import Voluntario
    from app.models.beneficiario import Beneficiario
    from app.models.telefone import Telefone
    from app.models.usuario import Usuario


class Pessoa(Base):
    __tablename__ = "pessoas"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    nome_completo: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    cpf: Mapped[str | None] = mapped_column(
        String(11),
        unique=True,
        nullable=True
    )

    rg: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    data_nascimento: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    sexo: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    email: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    estado_civil: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    profissao: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    escolaridade: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    nome_mae: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    nome_pai: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    endereco: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    cidade: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    estado: Mapped[str | None] = mapped_column(
        String(2),
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

    # Nome gerado (uuid4 + extensão) do arquivo de foto no armazenamento local — nunca um nome
    # enviado pelo usuário, mesma lógica de segurança dos anexos financeiros (tarefa 20). Nulo
    # por padrão: nenhuma pessoa tem foto até que alguém faça upload explicitamente.
    foto_arquivo: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True
    )

    @property
    def tem_foto(self) -> bool:
        return self.foto_arquivo is not None

    membro: Mapped["Membro | None"] = relationship(back_populates="pessoa")
    voluntario: Mapped["Voluntario | None"] = relationship(back_populates="pessoa")
    beneficiario: Mapped["Beneficiario | None"] = relationship(back_populates="pessoa")
    telefones: Mapped[list["Telefone"]] = relationship(
        back_populates="pessoa", cascade="all, delete-orphan"
    )
    usuario: Mapped["Usuario | None"] = relationship(back_populates="pessoa")