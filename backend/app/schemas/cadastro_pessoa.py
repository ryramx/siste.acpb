from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, model_validator

from app.schemas.beneficiario import BeneficiarioResponse
from app.schemas.membro import MembroResponse
from app.schemas.pessoa import PessoaCreate, PessoaResponse
from app.schemas.voluntario import VoluntarioResponse


class NovoMembroSemPessoa(BaseModel):
    cargo_id: int
    data_entrada: date
    data_saida: date | None = None
    motivo_saida: str | None = None
    ativo: bool = True
    observacoes: str | None = None


class NovoVoluntarioSemPessoa(BaseModel):
    data_inicio: date
    data_fim: date | None = None
    area: str | None = None
    habilidades: str | None = None
    disponibilidade: str | None = None
    observacoes: str | None = None


class NovoBeneficiarioSemPessoa(BaseModel):
    data_cadastro: date
    situacao_socioeconomica: str | None = None
    composicao_familiar: str | None = None
    renda_familiar: Decimal | None = None
    tamanho_familia: int | None = None
    necessidades: str | None = None
    observacoes: str | None = None


class CadastroPessoaComVinculoRequest(BaseModel):
    # Informe pessoa_id para reaproveitar uma Pessoa já cadastrada (permitindo múltiplos papéis
    # para a mesma pessoa) OU pessoa para cadastrar uma Pessoa nova — nunca os dois.
    pessoa_id: int | None = None
    pessoa: PessoaCreate | None = None

    papel: Literal["membro", "voluntario", "beneficiario"]
    membro: NovoMembroSemPessoa | None = None
    voluntario: NovoVoluntarioSemPessoa | None = None
    beneficiario: NovoBeneficiarioSemPessoa | None = None

    @model_validator(mode="after")
    def validar_consistencia(self) -> "CadastroPessoaComVinculoRequest":
        if bool(self.pessoa_id) == bool(self.pessoa):
            raise ValueError(
                "Informe exatamente um dos campos: 'pessoa_id' (reaproveitar) ou 'pessoa' (cadastrar nova)"
            )

        dados_por_papel = {
            "membro": self.membro,
            "voluntario": self.voluntario,
            "beneficiario": self.beneficiario,
        }
        if dados_por_papel[self.papel] is None:
            raise ValueError(f"O campo '{self.papel}' é obrigatório para papel='{self.papel}'")
        return self


class PapeisPessoaResponse(BaseModel):
    tem_membro: bool
    tem_voluntario: bool
    tem_beneficiario: bool
    tem_usuario: bool


class CadastroPessoaComVinculoResponse(BaseModel):
    pessoa: PessoaResponse
    papel_criado: str
    membro: MembroResponse | None = None
    voluntario: VoluntarioResponse | None = None
    beneficiario: BeneficiarioResponse | None = None
    papeis: PapeisPessoaResponse
