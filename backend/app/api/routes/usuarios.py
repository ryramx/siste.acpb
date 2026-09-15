from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError

from app.core.erros import tratar_integrity_error
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission
from app.core.auditoria import model_to_dict, obter_ip_cliente, registrar_auditoria
from app.core.security import hash_password
from app.db.session import get_db
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.schemas.usuario_perfil import UsuarioPerfilResponse

router = APIRouter()

PERFIL_ADMINISTRADOR = "Administrador"


@router.get(
    "/",
    response_model=list[UsuarioResponse],
    dependencies=[Depends(require_permission("usuarios.visualizar"))],
)
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()


@router.get(
    "/{id}",
    response_model=UsuarioResponse,
    dependencies=[Depends(require_permission("usuarios.visualizar"))],
)
def obter_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@router.post(
    "/",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("usuarios.criar"))],
)
def criar_usuario(
    obj_in: UsuarioCreate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    pessoa = db.query(Pessoa).filter(Pessoa.id == obj_in.pessoa_id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    agora = datetime.utcnow()
    usuario = Usuario(
        pessoa_id=obj_in.pessoa_id,
        email=obj_in.email,
        senha_hash=hash_password(obj_in.senha),
        ativo=obj_in.ativo,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="usuarios",
            registro_id=usuario.id,
            dados_novos=model_to_dict(usuario),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(usuario)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return usuario


@router.put(
    "/{id}",
    response_model=UsuarioResponse,
    dependencies=[Depends(require_permission("usuarios.editar"))],
)
def atualizar_usuario(
    id: int,
    obj_in: UsuarioUpdate,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    dados_antes = model_to_dict(usuario)

    update_data = obj_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(usuario, key, value)
    usuario.updated_at = datetime.utcnow()

    try:
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="editar",
            tabela="usuarios",
            registro_id=usuario.id,
            dados_anteriores=dados_antes,
            dados_novos=model_to_dict(usuario),
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(usuario)
    except IntegrityError as e:
        db.rollback()
        raise tratar_integrity_error(e)
    return usuario


@router.post(
    "/{id}/desativar",
    response_model=UsuarioResponse,
    dependencies=[Depends(require_permission("usuarios.editar"))],
)
def desativar_usuario(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    # Nunca excluímos usuários fisicamente: desativar preserva o histórico (auditoria,
    # movimentações financeiras lançadas por ele, etc.) — ver RELACIONAMENTOS.md.
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    dados_antes = model_to_dict(usuario)
    usuario.ativo = False
    usuario.updated_at = datetime.utcnow()

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="desativar",
        tabela="usuarios",
        registro_id=usuario.id,
        dados_anteriores=dados_antes,
        dados_novos=model_to_dict(usuario),
        ip=obter_ip_cliente(request),
    )
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get(
    "/{id}/perfis",
    response_model=list[UsuarioPerfilResponse],
    dependencies=[Depends(require_permission("usuarios.visualizar"))],
)
def listar_perfis_do_usuario(id: int, db: Session = Depends(get_db)):
    if not db.query(Usuario).filter(Usuario.id == id).first():
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == id).all()


@router.post(
    "/{id}/perfis/{perfil_id}",
    response_model=UsuarioPerfilResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("usuarios.editar"))],
)
def vincular_perfil_ao_usuario(
    id: int,
    perfil_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    if not db.query(Usuario).filter(Usuario.id == id).first():
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if not db.query(Perfil).filter(Perfil.id == perfil_id).first():
        raise HTTPException(status_code=404, detail="Perfil não encontrado")

    vinculo = UsuarioPerfil(usuario_id=id, perfil_id=perfil_id, created_at=datetime.utcnow())
    db.add(vinculo)
    try:
        db.flush()
        registrar_auditoria(
            db,
            usuario_id=usuario_atual.id,
            acao="criar",
            tabela="usuario_perfis",
            registro_id=vinculo.id,
            dados_novos={"usuario_id": id, "perfil_id": perfil_id},
            ip=obter_ip_cliente(request),
        )
        db.commit()
        db.refresh(vinculo)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este usuário já tem este perfil")
    return vinculo


@router.delete(
    "/{id}/perfis/{perfil_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("usuarios.editar"))],
)
def desvincular_perfil_do_usuario(
    id: int,
    perfil_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    vinculo = (
        db.query(UsuarioPerfil)
        .filter(UsuarioPerfil.usuario_id == id, UsuarioPerfil.perfil_id == perfil_id)
        .first()
    )
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")

    perfil = db.query(Perfil).filter(Perfil.id == perfil_id).first()
    if perfil and perfil.nome == PERFIL_ADMINISTRADOR:
        outros_admins_ativos = (
            db.query(UsuarioPerfil)
            .join(Usuario, Usuario.id == UsuarioPerfil.usuario_id)
            .filter(
                UsuarioPerfil.perfil_id == perfil_id,
                UsuarioPerfil.usuario_id != id,
                Usuario.ativo.is_(True),
            )
            .count()
        )
        if outros_admins_ativos == 0:
            raise HTTPException(
                status_code=409,
                detail="Não é possível remover o último administrador ativo do sistema",
            )

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="excluir",
        tabela="usuario_perfis",
        registro_id=vinculo.id,
        dados_anteriores={"usuario_id": id, "perfil_id": perfil_id},
        ip=obter_ip_cliente(request),
    )
    db.delete(vinculo)
    db.commit()
    return None
