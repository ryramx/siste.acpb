from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

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
    endereco: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None

class PessoaCreate(PessoaBase):
    pass

class PessoaUpdate(BaseModel):
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