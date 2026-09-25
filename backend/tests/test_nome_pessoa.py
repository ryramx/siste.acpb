"""Nome de gente não aceita número nem símbolo (RQ-06 da rodada de QA de 25/09/2026)."""

import pytest
from pydantic import ValidationError

from app.schemas.cadastro_pessoa import CadastroPessoaComVinculoRequest
from app.schemas.inscricao import InscricaoAvulsa
from app.schemas.patrimonio import PatrimonioCreate
from app.schemas.pessoa import PessoaCreate, PessoaResponse, PessoaUpdate


@pytest.mark.parametrize(
    "nome", ["Maria d'Ávila-Souza", "José da Silva", "Ana", "Joana D’Arc", "SQA Teste"]
)
def test_aceita_nomes_de_gente(nome):
    assert PessoaCreate(nome_completo=nome).nome_completo == nome


@pytest.mark.parametrize("nome", ["123123123", "João 2", "Jo", "   ", "Ana@Silva", "--", "Ana  -"])
def test_recusa_numero_simbolo_e_curto(nome):
    with pytest.raises(ValidationError):
        PessoaCreate(nome_completo=nome)
    with pytest.raises(ValidationError):
        PessoaUpdate(nome_completo=nome)


def test_tira_espacos_sobrando():
    assert PessoaCreate(nome_completo="  Maria   da  Silva ").nome_completo == "Maria da Silva"


def test_nomes_de_mae_pai_e_responsavel_tambem_valem():
    for campo in ("nome_mae", "nome_pai", "responsavel_nome"):
        with pytest.raises(ValidationError):
            PessoaUpdate(**{campo: "Mãe 1"})
        # Em branco continua podendo: são campos opcionais.
        assert getattr(PessoaUpdate(**{campo: ""}), campo) == ""
        assert getattr(PessoaUpdate(**{campo: None}), campo) is None


def test_cadastro_com_vinculo_e_inscricao_avulsa_passam_pela_regra():
    with pytest.raises(ValidationError):
        CadastroPessoaComVinculoRequest(
            pessoa={"nome_completo": "123123123"},
            papel="voluntario",
            voluntario={"data_inicio": "2026-09-25"},
        )
    with pytest.raises(ValidationError):
        InscricaoAvulsa(nome_completo="Visitante 3")


def test_nome_antigo_fora_da_regra_nao_quebra_a_listagem():
    # A resposta não valida: um nome gravado antes da regra continua aparecendo.
    PessoaResponse.model_validate(
        {"id": 1, "nome_completo": "123123123", "created_at": "2026-01-01T00:00:00",
         "updated_at": "2026-01-01T00:00:00"}
    )


def test_nome_de_bem_continua_aceitando_numero():
    bem = PatrimonioCreate(codigo="PAT-2", nome="Notebook 2", categoria="Informática")
    assert bem.nome == "Notebook 2"
