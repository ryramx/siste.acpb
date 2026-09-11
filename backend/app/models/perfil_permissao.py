from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.perfil import Perfil
    from app.models.permissao import Permissao


class PerfilPermissao(Base):
    __tablename__ = "perfil_permissoes"
    __table_args__ = (
        UniqueConstraint("perfil_id", "permissao_id", name="uq_perfil_permissao"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        nullable=False
    )

    perfil_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("perfis.id"),
        nullable=False
    )

    permissao_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("permissoes.id"),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    perfil: Mapped["Perfil"] = relationship()
    permissao: Mapped["Permissao"] = relationship()
