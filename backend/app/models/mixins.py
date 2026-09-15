from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Campos created_at/updated_at compartilhados pelos modelos que possuem ambos.

    Mantém exatamente o mesmo tipo, nullable e ausência de default/onupdate que os
    modelos já declaravam individualmente, para não alterar o schema efetivo.
    """

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
