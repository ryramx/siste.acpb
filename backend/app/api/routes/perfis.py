from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.db.session import get_db
from app.models.perfil import Perfil
from app.models.perfil_permissao import PerfilPermissao
from app.models.permissao import Permissao
from app.models.usuario import Usuario
from app.schemas.perfil import PerfilCreate, PerfilResponse, PerfilUpdate
from app.schemas.perfil_permissao import PerfilPermissaoResponse

router = APIRouter()

# Ver RBAC.md: administrar perfis/permissões/vínculos é restrito a quem administra usuários.
_gerenciar = [Depends(require_permission("usuarios.editar"))]
_visualizar = [Depends(require_permission("usuarios.visualizar"))]

PERFIL_ADMINISTRADOR = "Administrador"


def _buscar_perfil_ou_404(db: Session, id: int) -> Perfil:
    perfil = db.query(Perfil).filter(Perfil.id == id).first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    return perfil


@router.get("/", response_model=list[PerfilResponse], dependencies=_visualizar)
def listar_perfis(db: Session = Depends(get_db)):
    return db.query(Perfil).all()


@router.get("/{id}", response_model=PerfilResponse, dependencies=_visualizar)
def obter_perfil(id: int, db: Session = Depends(get_db)):
    return _buscar_perfil_ou_404(db, id)


@router.post(
    "/", response_model=PerfilResponse, status_code=status.HTTP_201_CREATED, dependencies=_gerenciar
)
def criar_perfil(
    obj_in: PerfilCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    agora = datetime.utcnow()
    obj = Perfil(**obj_in.model_dump(), created_at=agora, updated_at=agora)
    db.add(obj)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="perfis",
            registro_id=obj.id,
            dados_novos=model_to_dict(obj),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(obj)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe um perfil com este nome")
    return obj


@router.put("/{id}", response_model=PerfilResponse, dependencies=_gerenciar)
def atualizar_perfil(
    id: int,
    obj_in: PerfilUpdate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    perfil = _buscar_perfil_ou_404(db, id)

    update_data = obj_in.model_dump(exclude_unset=True)
    if perfil.nome == PERFIL_ADMINISTRADOR and update_data.get("ativo") is False:
        raise HTTPException(
            status_code=409,
            detail="O perfil Administrador não pode ser desativado (quebraria a administração do sistema)",
        )

    dados_antes = model_to_dict(perfil)
    for key, value in update_data.items():
        setattr(perfil, key, value)
    perfil.updated_at = datetime.utcnow()

    try:
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="editar",
            tabela="perfis",
            registro_id=perfil.id,
            dados_anteriores=dados_antes,
            dados_novos=model_to_dict(perfil),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(perfil)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe um perfil com este nome")
    return perfil


@router.get(
    "/{id}/permissoes", response_model=list[PerfilPermissaoResponse], dependencies=_visualizar
)
def listar_permissoes_do_perfil(id: int, db: Session = Depends(get_db)):
    _buscar_perfil_ou_404(db, id)
    return db.query(PerfilPermissao).filter(PerfilPermissao.perfil_id == id).all()


@router.post(
    "/{id}/permissoes/{permissao_id}",
    response_model=PerfilPermissaoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=_gerenciar,
)
def vincular_permissao_ao_perfil(
    id: int,
    permissao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    _buscar_perfil_ou_404(db, id)
    if not db.query(Permissao).filter(Permissao.id == permissao_id).first():
        raise HTTPException(status_code=404, detail="Permissão não encontrada")

    vinculo = PerfilPermissao(
        perfil_id=id, permissao_id=permissao_id, created_at=datetime.utcnow()
    )
    db.add(vinculo)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="perfil_permissoes",
            registro_id=vinculo.id,
            dados_novos={"perfil_id": id, "permissao_id": permissao_id},
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(vinculo)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este perfil já tem esta permissão")
    return vinculo


@router.delete(
    "/{id}/permissoes/{permissao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=_gerenciar,
)
def desvincular_permissao_do_perfil(
    id: int,
    permissao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    perfil = _buscar_perfil_ou_404(db, id)

    if perfil.nome == PERFIL_ADMINISTRADOR:
        raise HTTPException(
            status_code=409,
            detail="Não é possível remover permissões do perfil Administrador (quebraria a administração do sistema)",
        )

    vinculo = (
        db.query(PerfilPermissao)
        .filter(PerfilPermissao.perfil_id == id, PerfilPermissao.permissao_id == permissao_id)
        .first()
    )
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="perfil_permissoes",
        registro_id=vinculo.id,
        dados_anteriores={"perfil_id": id, "permissao_id": permissao_id},
        ip=obter_ip_cliente(request),
    )
    db.delete(vinculo)
    db.commit()
    return None
