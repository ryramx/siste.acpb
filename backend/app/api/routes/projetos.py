from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.beneficiario import Beneficiario
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.models.projeto_beneficiario import ProjetoBeneficiario
from app.models.projeto_voluntario import ProjetoVoluntario
from app.models.voluntario import Voluntario
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse
from app.schemas.projeto_beneficiario import (
    ProjetoBeneficiarioResponse,
    ProjetoBeneficiarioVinculo,
)
from app.schemas.projeto_voluntario import (
    ProjetoVoluntarioResponse,
    ProjetoVoluntarioVinculo,
)

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if dados.get("responsavel_id") is not None and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")

@router.get("/", response_model=list[ProjetoResponse], dependencies=[Depends(require_permission("projetos.visualizar"))])
def listar_projetos(db: Session = Depends(get_db)):
    return db.query(Projeto).all()

@router.get("/{id}", response_model=ProjetoResponse, dependencies=[Depends(require_permission("projetos.visualizar"))])
def obter_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    return obj

@router.post("/", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("projetos.criar"))])
def criar_projeto(obj_in: ProjetoCreate, db: Session = Depends(get_db)):
    _validar_referencias(db, obj_in.model_dump())
    agora = datetime.utcnow()
    obj = Projeto(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=ProjetoResponse, dependencies=[Depends(require_permission("projetos.editar"))])
def atualizar_projeto(id: int, obj_in: ProjetoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    _validar_referencias(db, update_data)
    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()
        
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("projetos.editar"))])
def deletar_projeto(id: int, db: Session = Depends(get_db)):
    obj = db.query(Projeto).filter(Projeto.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None


# ---------------------------------------------------------------------------
# Vínculos do projeto: quem trabalha nele (voluntários) e quem ele atende
# (beneficiários). Reusam as permissões do próprio projeto — montar a equipe e o
# público de um projeto é editá-lo, não um módulo à parte.
# ---------------------------------------------------------------------------


def _obter_projeto_ou_404(db: Session, projeto_id: int) -> Projeto:
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado(a)")
    return projeto


@router.get(
    "/{id}/voluntarios",
    response_model=list[ProjetoVoluntarioResponse],
    dependencies=[Depends(require_permission("projetos.visualizar"))],
)
def listar_voluntarios_do_projeto(id: int, db: Session = Depends(get_db)):
    _obter_projeto_ou_404(db, id)
    linhas = (
        db.query(ProjetoVoluntario, Pessoa.id, Pessoa.nome_completo, Voluntario.area)
        .join(Voluntario, ProjetoVoluntario.voluntario_id == Voluntario.id)
        .join(Pessoa, Voluntario.pessoa_id == Pessoa.id)
        .filter(ProjetoVoluntario.projeto_id == id)
        .order_by(Pessoa.nome_completo)
        .all()
    )
    return [
        ProjetoVoluntarioResponse.model_validate(vinculo).model_copy(
            update={"pessoa_id": pessoa_id, "pessoa_nome": nome, "area": area}
        )
        for vinculo, pessoa_id, nome, area in linhas
    ]


@router.post(
    "/{id}/voluntarios",
    response_model=ProjetoVoluntarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("projetos.editar"))],
)
def vincular_voluntario(
    id: int, obj_in: ProjetoVoluntarioVinculo, db: Session = Depends(get_db)
):
    _obter_projeto_ou_404(db, id)
    voluntario = (
        db.query(Voluntario).filter(Voluntario.id == obj_in.voluntario_id).first()
    )
    if not voluntario:
        raise HTTPException(status_code=404, detail="Voluntário não encontrado")

    agora = datetime.utcnow()
    obj = ProjetoVoluntario(
        projeto_id=id, **obj_in.model_dump(), created_at=agora, updated_at=agora
    )
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)

    pessoa = db.query(Pessoa).filter(Pessoa.id == voluntario.pessoa_id).first()
    return ProjetoVoluntarioResponse.model_validate(obj).model_copy(
        update={
            "pessoa_id": voluntario.pessoa_id,
            "pessoa_nome": pessoa.nome_completo if pessoa else None,
            "area": voluntario.area,
        }
    )


@router.delete(
    "/{id}/voluntarios/{vinculo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("projetos.editar"))],
)
def desvincular_voluntario(id: int, vinculo_id: int, db: Session = Depends(get_db)):
    obj = (
        db.query(ProjetoVoluntario)
        .filter(ProjetoVoluntario.id == vinculo_id, ProjetoVoluntario.projeto_id == id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    db.delete(obj)
    db.commit()
    return None


@router.get(
    "/{id}/beneficiarios",
    response_model=list[ProjetoBeneficiarioResponse],
    dependencies=[Depends(require_permission("projetos.visualizar"))],
)
def listar_beneficiarios_do_projeto(id: int, db: Session = Depends(get_db)):
    _obter_projeto_ou_404(db, id)
    linhas = (
        db.query(ProjetoBeneficiario, Pessoa.id, Pessoa.nome_completo)
        .join(Beneficiario, ProjetoBeneficiario.beneficiario_id == Beneficiario.id)
        .join(Pessoa, Beneficiario.pessoa_id == Pessoa.id)
        .filter(ProjetoBeneficiario.projeto_id == id)
        .order_by(Pessoa.nome_completo)
        .all()
    )
    return [
        ProjetoBeneficiarioResponse.model_validate(vinculo).model_copy(
            update={"pessoa_id": pessoa_id, "pessoa_nome": nome}
        )
        for vinculo, pessoa_id, nome in linhas
    ]


@router.post(
    "/{id}/beneficiarios",
    response_model=ProjetoBeneficiarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("projetos.editar"))],
)
def vincular_beneficiario(
    id: int, obj_in: ProjetoBeneficiarioVinculo, db: Session = Depends(get_db)
):
    _obter_projeto_ou_404(db, id)
    beneficiario = (
        db.query(Beneficiario)
        .filter(Beneficiario.id == obj_in.beneficiario_id)
        .first()
    )
    if not beneficiario:
        raise HTTPException(status_code=404, detail="Beneficiário não encontrado")

    agora = datetime.utcnow()
    obj = ProjetoBeneficiario(
        projeto_id=id, **obj_in.model_dump(), created_at=agora, updated_at=agora
    )
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)

    pessoa = db.query(Pessoa).filter(Pessoa.id == beneficiario.pessoa_id).first()
    return ProjetoBeneficiarioResponse.model_validate(obj).model_copy(
        update={
            "pessoa_id": beneficiario.pessoa_id,
            "pessoa_nome": pessoa.nome_completo if pessoa else None,
        }
    )


@router.delete(
    "/{id}/beneficiarios/{vinculo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("projetos.editar"))],
)
def desvincular_beneficiario(id: int, vinculo_id: int, db: Session = Depends(get_db)):
    obj = (
        db.query(ProjetoBeneficiario)
        .filter(
            ProjetoBeneficiario.id == vinculo_id,
            ProjetoBeneficiario.projeto_id == id,
        )
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    db.delete(obj)
    db.commit()
    return None
