from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.nome_pessoa import normalizar_nome_opcional, normalizar_nome_pessoa

_CAMPOS_NOME_OPCIONAIS = {
    "nome_mae": "O nome da mãe",
    "nome_pai": "O nome do pai",
    "responsavel_nome": "O nome do responsável",
}


class _ValidaNomes:
    """Validação dos nomes de gente, só na entrada (criar e editar).

    Fica fora da PessoaBase de propósito: a PessoaResponse herda dela, e um nome antigo que não
    passe na regra faria a listagem inteira quebrar em vez de só aparecer.
    """

    @field_validator("nome_completo", check_fields=False)
    @classmethod
    def validar_nome_completo(cls, v: str | None) -> str | None:
        return None if v is None else normalizar_nome_pessoa(v, "O nome completo")

    @field_validator("nome_mae", "nome_pai", "responsavel_nome", check_fields=False)
    @classmethod
    def validar_nomes_opcionais(cls, v: str | None, info) -> str | None:
        return normalizar_nome_opcional(v, _CAMPOS_NOME_OPCIONAIS[info.field_name])


class PessoaBase(BaseModel):
    nome_completo: str
    cpf: str | None = None
    rg: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None
    email: str | None = None
    estado_civil: str | None = None
    profissao: str | None = None
    escolaridade: str | None = None
    nome_mae: str | None = None
    nome_pai: str | None = None
    responsavel_nome: str | None = None
    responsavel_telefone: str | None = None
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None

class PessoaCreate(_ValidaNomes, PessoaBase):
    pass

class PessoaUpdate(_ValidaNomes, BaseModel):
    conta_tecnica: bool | None = None
    nome_completo: str | None = None
    cpf: str | None = None
    rg: str | None = None
    data_nascimento: date | None = None
    sexo: str | None = None
    email: str | None = None
    estado_civil: str | None = None
    profissao: str | None = None
    escolaridade: str | None = None
    nome_mae: str | None = None
    nome_pai: str | None = None
    responsavel_nome: str | None = None
    responsavel_telefone: str | None = None
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None

class PessoaResponse(PessoaBase):
    id: int
    tem_foto: bool = False
    # Ver Pessoa.conta_tecnica: contas de operacao do sistema, fora das listas de escolher
    # pessoa para atividades da associacao.
    conta_tecnica: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)