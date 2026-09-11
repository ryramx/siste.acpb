from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_permissoes_usuario
from app.db.session import get_db
from app.models.beneficiario import Beneficiario
from app.models.membro import Membro
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.voluntario import Voluntario
from app.schemas.beneficiario import BeneficiarioResponse
from app.schemas.cadastro_pessoa import (
    CadastroPessoaComVinculoRequest,
    CadastroPessoaComVinculoResponse,
    PapeisPessoaResponse,
)
from app.schemas.membro import MembroResponse
from app.schemas.pessoa import PessoaResponse
from app.schemas.voluntario import VoluntarioResponse

router = APIRouter()

PERMISSAO_POR_PAPEL = {
    "membro": "membros.criar",
    "voluntario": "voluntarios.criar",
    "beneficiario": "beneficiarios.criar",
}


def _papeis_da_pessoa(db: Session, pessoa_id: int) -> PapeisPessoaResponse:
    return PapeisPessoaResponse(
        tem_membro=db.query(Membro).filter(Membro.pessoa_id == pessoa_id).first() is not None,
        tem_voluntario=db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).first()
        is not None,
        tem_beneficiario=db.query(Beneficiario).filter(Beneficiario.pessoa_id == pessoa_id).first()
        is not None,
        tem_usuario=False,  # preenchido pelo endpoint que já carrega Usuario, se necessário
    )


@router.post(
    "/pessoa-vinculo",
    response_model=CadastroPessoaComVinculoResponse,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_pessoa_com_vinculo(
    dados: CadastroPessoaComVinculoRequest,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    permissoes = get_permissoes_usuario(usuario_atual, db)
    necessarias = {"pessoas.criar", PERMISSAO_POR_PAPEL[dados.papel]}
    if not necessarias.issubset(permissoes):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requer as permissões: {', '.join(sorted(necessarias))}",
        )

    agora = datetime.utcnow()

    if dados.pessoa_id is not None:
        pessoa = db.query(Pessoa).filter(Pessoa.id == dados.pessoa_id).first()
        if not pessoa:
            raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    else:
        if dados.pessoa.cpf:
            existente = db.query(Pessoa).filter(Pessoa.cpf == dados.pessoa.cpf).first()
            if existente:
                raise HTTPException(
                    status_code=400,
                    detail="Já existe uma pessoa cadastrada com este CPF — use pessoa_id para reaproveitá-la",
                )
        pessoa = Pessoa(**dados.pessoa.model_dump(), created_at=agora, updated_at=agora)
        db.add(pessoa)
        db.flush()  # garante pessoa.id sem commitar ainda: falha no vínculo desfaz tudo

    vinculo_criado = None
    try:
        if dados.papel == "membro":
            vinculo_criado = Membro(
                pessoa_id=pessoa.id,
                **dados.membro.model_dump(),
                created_at=agora,
                updated_at=agora,
            )
        elif dados.papel == "voluntario":
            vinculo_criado = Voluntario(
                pessoa_id=pessoa.id,
                **dados.voluntario.model_dump(),
                created_at=agora,
                updated_at=agora,
            )
        else:
            vinculo_criado = Beneficiario(
                pessoa_id=pessoa.id,
                **dados.beneficiario.model_dump(),
                created_at=agora,
                updated_at=agora,
            )
        db.add(vinculo_criado)
        db.commit()
        db.refresh(pessoa)
        db.refresh(vinculo_criado)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Esta pessoa já possui um vínculo de '{dados.papel}' ou os dados violam uma restrição",
        )

    papeis = _papeis_da_pessoa(db, pessoa.id)

    schema_por_papel = {
        "membro": MembroResponse,
        "voluntario": VoluntarioResponse,
        "beneficiario": BeneficiarioResponse,
    }
    vinculo_serializado = schema_por_papel[dados.papel].model_validate(vinculo_criado)

    return CadastroPessoaComVinculoResponse(
        pessoa=PessoaResponse.model_validate(pessoa),
        papel_criado=dados.papel,
        papeis=papeis,
        **{dados.papel: vinculo_serializado},
    )


@router.get("/pessoa/{pessoa_id}/papeis", response_model=PapeisPessoaResponse)
def obter_papeis_da_pessoa(
    pessoa_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    permissoes = get_permissoes_usuario(usuario_atual, db)
    if "pessoas.visualizar" not in permissoes:
        raise HTTPException(status_code=403, detail="Requer a permissão pessoas.visualizar")

    if not db.query(Pessoa).filter(Pessoa.id == pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    papeis = _papeis_da_pessoa(db, pessoa_id)
    papeis.tem_usuario = (
        db.query(Usuario).filter(Usuario.pessoa_id == pessoa_id).first() is not None
    )
    return papeis
