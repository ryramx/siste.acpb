import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.telefone import normalizar_numero_telefone

# Status possíveis de uma inscrição. Concordam com "inscrição" (femininos) — o frontend
# comparava com "CONFIRMADO" e nunca batia com o "CONFIRMADA" que gravava.
StatusInscricao = Literal["CONFIRMADA", "PENDENTE", "CANCELADA"]

class InscricaoBase(BaseModel):
    pessoa_id: int
    evento_id: int
    data_inscricao: datetime
    status: StatusInscricao
    observacoes: str | None = None

class InscricaoCreate(InscricaoBase):
    pass

class InscricaoEvento(BaseModel):
    """Corpo do POST /eventos/{id}/inscricoes — o evento vem da URL, não do corpo.
    A data da inscrição é o instante do registro, por isso não é pedida."""
    pessoa_id: int
    status: StatusInscricao = "CONFIRMADA"
    observacoes: str | None = None

class InscricaoAvulsa(BaseModel):
    """Corpo do POST /eventos/{id}/inscricoes/avulsa — inscreve um visitante que ainda não
    tem cadastro. Cria a Pessoa (sem papel de membro/voluntário/beneficiário) e a inscrição
    na mesma transação: uma Pessoa órfã, sem inscrição, seria lixo no cadastro."""
    nome_completo: str
    cpf: str | None = None
    email: str | None = None
    telefone: str | None = None
    status: StatusInscricao = "CONFIRMADA"
    observacoes: str | None = None

    @field_validator("cpf")
    @classmethod
    def normalizar_cpf(cls, v: str | None) -> str | None:
        # A coluna guarda só dígitos (ver Pessoa.cpf); o formulário envia com máscara.
        digitos = re.sub(r"\D", "", v) if v else ""
        return digitos or None

    @field_validator("telefone")
    @classmethod
    def validar_telefone(cls, v: str | None) -> str | None:
        return normalizar_numero_telefone(v) if v and v.strip() else None

    @field_validator("nome_completo")
    @classmethod
    def validar_nome(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Informe o nome do participante")
        return v.strip()

class InscricaoUpdate(BaseModel):
    pessoa_id: int | None = None
    evento_id: int | None = None
    data_inscricao: datetime | None = None
    status: StatusInscricao | None = None
    observacoes: str | None = None

class InscricaoResponse(InscricaoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    # Denormalizados na rota — mesma razão dos vínculos de projeto: a tela lista participantes
    # por nome/telefone e buscá-los um a um seria uma consulta por linha.
    pessoa_nome: str | None = None
    pessoa_telefone: str | None = None

    model_config = ConfigDict(from_attributes=True)
