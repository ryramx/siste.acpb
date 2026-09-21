from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import get_current_user, get_permissoes_usuario, require_permission
from app.api.routes.health import get_db
from app.api.routes.inscricoes import (
    denormalizar,
    validar_nao_duplicada,
    validar_vaga_disponivel,
)
from app.models.evento import Evento
from app.models.inscricao import Inscricao
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.models.telefone import Telefone
from app.models.usuario import Usuario
from app.schemas.evento import EventoCreate, EventoUpdate, EventoResponse
from app.schemas.inscricao import InscricaoAvulsa, InscricaoEvento, InscricaoResponse

router = APIRouter()


def _validar_referencias(db: Session, dados: dict) -> None:
    if dados.get("responsavel_id") is not None and not db.query(Pessoa).filter(
        Pessoa.id == dados["responsavel_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Pessoa responsável não encontrada")
    if dados.get("projeto_id") is not None and not db.query(Projeto).filter(
        Projeto.id == dados["projeto_id"]
    ).first():
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

@router.get("/", response_model=list[EventoResponse], dependencies=[Depends(require_permission("eventos.visualizar"))])
def listar_eventos(db: Session = Depends(get_db)):
    return db.query(Evento).all()

@router.get("/{id}", response_model=EventoResponse, dependencies=[Depends(require_permission("eventos.visualizar"))])
def obter_evento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    return obj

@router.post("/", response_model=EventoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("eventos.criar"))])
def criar_evento(obj_in: EventoCreate, db: Session = Depends(get_db)):
    _validar_referencias(db, obj_in.model_dump())
    agora = datetime.utcnow()
    obj = Evento(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return obj

@router.put("/{id}", response_model=EventoResponse, dependencies=[Depends(require_permission("eventos.editar"))])
def atualizar_evento(id: int, obj_in: EventoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    
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

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("eventos.editar"))])
def deletar_evento(id: int, db: Session = Depends(get_db)):
    obj = db.query(Evento).filter(Evento.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None


def _obter_evento(id: int, db: Session) -> Evento:
    evento = db.query(Evento).filter(Evento.id == id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado(a)")
    return evento


@router.get(
    "/{id}/inscricoes",
    response_model=list[InscricaoResponse],
    dependencies=[Depends(require_permission("inscricoes.visualizar"))],
)
def listar_inscricoes_do_evento(id: int, db: Session = Depends(get_db)):
    _obter_evento(id, db)
    inscricoes = (
        db.query(Inscricao)
        .filter(Inscricao.evento_id == id)
        .order_by(Inscricao.data_inscricao)
        .all()
    )
    return denormalizar(db, inscricoes)


@router.post(
    "/{id}/inscricoes",
    response_model=InscricaoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inscricoes.criar"))],
)
def inscrever_pessoa(id: int, obj_in: InscricaoEvento, db: Session = Depends(get_db)):
    """Inscreve alguém que já tem cadastro — membro, voluntário, beneficiário ou visitante
    de um evento anterior. Todos são Pessoa; o papel não restringe a inscrição."""
    evento = _obter_evento(id, db)
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    validar_nao_duplicada(db, evento.id, obj_in.pessoa_id)
    validar_vaga_disponivel(db, evento, obj_in.status)

    agora = datetime.utcnow()
    obj = Inscricao(
        pessoa_id=obj_in.pessoa_id,
        evento_id=evento.id,
        data_inscricao=agora,
        status=obj_in.status,
        observacoes=obj_in.observacoes,
        created_at=agora,
        updated_at=agora,
    )
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return denormalizar(db, [obj])[0]


@router.post(
    "/{id}/inscricoes/avulsa",
    response_model=InscricaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def inscrever_avulso(
    id: int,
    obj_in: InscricaoAvulsa,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    """Inscreve um visitante ainda sem cadastro: cria a Pessoa com o mínimo informado no
    balcão (nome e, opcionalmente, telefone/CPF/e-mail) e já a inscreve. Exige também
    pessoas.criar porque grava no cadastro de pessoas, não só em inscrições."""
    necessarias = {"pessoas.criar", "inscricoes.criar"}
    if not necessarias.issubset(get_permissoes_usuario(usuario_atual, db)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requer as permissões: {', '.join(sorted(necessarias))}",
        )

    evento = _obter_evento(id, db)
    validar_vaga_disponivel(db, evento, obj_in.status)

    if obj_in.cpf:
        existente = db.query(Pessoa).filter(Pessoa.cpf == obj_in.cpf).first()
        if existente:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Já existe uma pessoa cadastrada com este CPF ({existente.nome_completo})"
                    " — inscreva-a pela busca de pessoas em vez de cadastrar de novo"
                ),
            )

    agora = datetime.utcnow()
    pessoa = Pessoa(
        nome_completo=obj_in.nome_completo,
        cpf=obj_in.cpf,
        email=obj_in.email,
        created_at=agora,
        updated_at=agora,
    )
    db.add(pessoa)
    db.flush()  # precisa do pessoa.id sem commitar: falha adiante desfaz o cadastro junto

    if obj_in.telefone:
        db.add(
            Telefone(
                pessoa_id=pessoa.id,
                numero=obj_in.telefone,
                tipo="CELULAR",
                principal=True,
                whatsapp=False,
            )
        )

    inscricao = Inscricao(
        pessoa_id=pessoa.id,
        evento_id=evento.id,
        data_inscricao=agora,
        status=obj_in.status,
        observacoes=obj_in.observacoes,
        created_at=agora,
        updated_at=agora,
    )
    db.add(inscricao)
    try:
        db.commit()
        db.refresh(inscricao)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return denormalizar(db, [inscricao])[0]
