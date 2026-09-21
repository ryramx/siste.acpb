from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime

from app.core.erros import tratar_integrity_error

from app.api.deps import require_permission
from app.api.routes.health import get_db
from app.models.evento import Evento
from app.models.inscricao import Inscricao
from app.models.pessoa import Pessoa
from app.models.telefone import Telefone
from app.schemas.inscricao import InscricaoCreate, InscricaoUpdate, InscricaoResponse

router = APIRouter()


def contar_inscritos(db: Session, evento_id: int, ignorar_id: int | None = None) -> int:
    """Inscritos que ocupam vaga. Canceladas ficam no histórico mas liberam a vaga."""
    query = db.query(Inscricao).filter(
        Inscricao.evento_id == evento_id, Inscricao.status != "CANCELADA"
    )
    if ignorar_id is not None:
        query = query.filter(Inscricao.id != ignorar_id)
    return query.count()


def validar_vaga_disponivel(
    db: Session, evento: Evento, status_novo: str, ignorar_id: int | None = None
) -> None:
    """Recusa a inscrição quando o evento já atingiu `limite_participantes`. Sem limite
    definido (None) o evento é aberto e não há o que checar."""
    if evento.limite_participantes is None or status_novo == "CANCELADA":
        return
    if contar_inscritos(db, evento.id, ignorar_id) >= evento.limite_participantes:
        raise HTTPException(
            status_code=409,
            detail=f"O evento '{evento.nome}' já atingiu o limite de {evento.limite_participantes} participantes",
        )


def validar_nao_duplicada(
    db: Session, evento_id: int, pessoa_id: int, ignorar_id: int | None = None
) -> None:
    """O banco já barra o par (pessoa, evento) repetido por constraint; checar antes
    permite dar o nome da pessoa no erro em vez de um 409 genérico de integridade."""
    query = db.query(Inscricao).filter(
        Inscricao.evento_id == evento_id, Inscricao.pessoa_id == pessoa_id
    )
    if ignorar_id is not None:
        query = query.filter(Inscricao.id != ignorar_id)
    if query.first():
        raise HTTPException(status_code=409, detail="Esta pessoa já está inscrita neste evento")


def denormalizar(db: Session, inscricoes: list[Inscricao]) -> list[InscricaoResponse]:
    """Anexa nome e telefone principal de cada participante em duas consultas, em vez de
    uma por linha como o frontend fazia ao montar a tela de inscrições."""
    if not inscricoes:
        return []

    pessoa_ids = {i.pessoa_id for i in inscricoes}
    nomes = dict(
        db.query(Pessoa.id, Pessoa.nome_completo).filter(Pessoa.id.in_(pessoa_ids)).all()
    )

    telefones: dict[int, str] = {}
    # Ordena com os principais por último para que eles sobrescrevam os secundários.
    for pessoa_id, numero in (
        db.query(Telefone.pessoa_id, Telefone.numero)
        .filter(Telefone.pessoa_id.in_(pessoa_ids))
        .order_by(Telefone.principal)
        .all()
    ):
        telefones[pessoa_id] = numero

    return [
        InscricaoResponse.model_validate(i).model_copy(
            update={
                "pessoa_nome": nomes.get(i.pessoa_id),
                "pessoa_telefone": telefones.get(i.pessoa_id),
            }
        )
        for i in inscricoes
    ]


@router.get("/", response_model=list[InscricaoResponse], dependencies=[Depends(require_permission("inscricoes.visualizar"))])
def listar_inscricoes(
    evento_id: int | None = None,
    pessoa_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Inscricao)
    if evento_id is not None:
        query = query.filter(Inscricao.evento_id == evento_id)
    if pessoa_id is not None:
        query = query.filter(Inscricao.pessoa_id == pessoa_id)
    return denormalizar(db, query.all())

@router.get("/{id}", response_model=InscricaoResponse, dependencies=[Depends(require_permission("inscricoes.visualizar"))])
def obter_inscricao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
    return denormalizar(db, [obj])[0]

@router.post("/", response_model=InscricaoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("inscricoes.criar"))])
def criar_inscricao(obj_in: InscricaoCreate, db: Session = Depends(get_db)):
    if not db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first():
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    evento = db.query(Evento).filter(Evento.id == obj_in.evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    validar_nao_duplicada(db, evento.id, obj_in.pessoa_id)
    validar_vaga_disponivel(db, evento, obj_in.status)

    agora = datetime.utcnow()
    obj = Inscricao(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return denormalizar(db, [obj])[0]

@router.put("/{id}", response_model=InscricaoResponse, dependencies=[Depends(require_permission("inscricoes.editar"))])
def atualizar_inscricao(id: int, obj_in: InscricaoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")

    update_data = obj_in.model_dump(exclude_unset=True)

    evento_id = update_data.get("evento_id", obj.evento_id)
    pessoa_id = update_data.get("pessoa_id", obj.pessoa_id)
    status_novo = update_data.get("status", obj.status)
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    if (evento_id, pessoa_id) != (obj.evento_id, obj.pessoa_id):
        validar_nao_duplicada(db, evento_id, pessoa_id, ignorar_id=obj.id)
    # Reativar uma inscrição cancelada (ou movê-la de evento) volta a ocupar vaga.
    if status_novo != "CANCELADA" and (obj.status == "CANCELADA" or evento_id != obj.evento_id):
        validar_vaga_disponivel(db, evento, status_novo, ignorar_id=obj.id)

    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return denormalizar(db, [obj])[0]

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("inscricoes.editar"))])
def deletar_inscricao(id: int, db: Session = Depends(get_db)):
    obj = db.query(Inscricao).filter(Inscricao.id == id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Inscricao não encontrado(a)")
        
    db.delete(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não é possível excluir devido a dependências (Integridade referencial)")
    return None
