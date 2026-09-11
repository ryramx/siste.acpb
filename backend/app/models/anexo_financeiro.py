from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.movimentacao_financeira import MovimentacaoFinanceira
    from app.models.usuario import Usuario


class AnexoFinanceiro(Base):
    __tablename__ = "anexos_financeiros"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, nullable=False)

    movimentacao_financeira_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("movimentacoes_financeiras.id"), nullable=False
    )

    nome_original: Mapped[str] = mapped_column(String(255), nullable=False)

    # Nome gerado (UUID + extensão) usado no disco/armazenamento — nunca o nome enviado pelo
    # usuário, para evitar path traversal e colisões (ver AnexosFinanceiros na tarefa 20).
    nome_armazenado: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    tipo_mime: Mapped[str] = mapped_column(String(100), nullable=False)

    tamanho_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    enviado_por_usuario_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("usuarios.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    movimentacao_financeira: Mapped["MovimentacaoFinanceira"] = relationship()
    enviado_por: Mapped["Usuario"] = relationship()
