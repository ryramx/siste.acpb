from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AnexoFinanceiroResponse(BaseModel):
    id: int
    movimentacao_financeira_id: int
    nome_original: str
    tipo_mime: str
    tamanho_bytes: int
    enviado_por_usuario_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
