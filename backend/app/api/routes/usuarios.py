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
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioRedefinirSenha,
    UsuarioResponse,
    UsuarioUpdate,
)
from app.schemas.usuario_perfil import UsuarioPerfilResponse

router = APIRouter()

PERFIL_ADMINISTRADOR = "Administrador"

# Travas contra perder o acesso ao sistema. Sem elas, qualquer administrador podia desativar a
# si mesmo, o último admin ativo ou o dono do sistema — e o script de recuperação
# (scripts/criar_admin.py) se recusa a rodar enquanto houver algum admin ativo, então o dono
# desativado por outro admin ficava sem caminho de volta.
MSG_DESATIVAR_PROPRIA = "Você não pode desativar a sua própria conta."
MSG_REMOVER_PROPRIO_ADMIN = "Você não pode remover o seu próprio perfil de Administrador."
MSG_CONTA_PRINCIPAL = (
    "Esta é a conta principal do sistema. Só o próprio titular pode alterá-la."
)
MSG_ULTIMO_ADMIN = "Não é possível remover o último administrador ativo do sistema"


def _outros_admins_ativos(db: Session, excluindo_usuario_id: int) -> int:
    return (
        db.query(UsuarioPerfil)
        .join(Usuario, Usuario.id == UsuarioPerfil.usuario_id)
        .join(Perfil, Perfil.id == UsuarioPerfil.perfil_id)
        .filter(
            Perfil.nome == PERFIL_ADMINISTRADOR,
            UsuarioPerfil.usuario_id != excluindo_usuario_id,
            Usuario.ativo.is_(True),
        )
        .count()
    )


def _eh_admin(db: Session, usuario_id: int) -> bool:
    return (
        db.query(UsuarioPerfil)
        .join(Perfil, Perfil.id == UsuarioPerfil.perfil_id)
        .filter(UsuarioPerfil.usuario_id == usuario_id, Perfil.nome == PERFIL_ADMINISTRADOR)
        .first()
        is not None
    )


def _recusar(
    db: Session,
    request: Request,
    usuario_atual: Usuario,
    *,
    tabela: str,
    registro_id: int,
    tentativa: str,
    status_code: int,
    detalhe: str,
) -> None:
    """Registra a tentativa bloqueada na auditoria e responde com o erro.

    Só pode ser chamada antes de qualquer alteração no alvo: o commit aqui grava a auditoria
    e gravaria junto qualquer mudança pendente na sessão.
    """
    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="bloquear",
        tabela=tabela,
        registro_id=registro_id,
        descricao=detalhe,
        dados_novos={"tentativa": tentativa},
        ip=obter_ip_cliente(request),
    )
    db.commit()
    raise HTTPException(status_code=status_code, detail=detalhe)


def _exigir_que_pode_desativar(
    db: Session, request: Request, usuario_atual: Usuario, alvo: Usuario
) -> None:
    recusa = None
    if alvo.id == usuario_atual.id:
        recusa = (403, MSG_DESATIVAR_PROPRIA)
    elif alvo.protegido:
        recusa = (403, MSG_CONTA_PRINCIPAL)
    elif alvo.ativo and _eh_admin(db, alvo.id) and _outros_admins_ativos(db, alvo.id) == 0:
        recusa = (409, MSG_ULTIMO_ADMIN)
    if recusa:
        _recusar(
            db, request, usuario_atual,
            tabela="usuarios", registro_id=alvo.id, tentativa="desativar",
            status_code=recusa[0], detalhe=recusa[1],
        )


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

    update_data = obj_in.model_dump(exclude_unset=True)
    if update_data.get("ativo") is False and usuario.ativo:
        _exigir_que_pode_desativar(db, request, usuario_atual, usuario)
    # Reativar a conta principal é o único ajuste que outro usuário pode fazer nela: é o
    # caminho de volta caso ela tenha ficado inativa de algum jeito.
    if (
        usuario.protegido
        and usuario.id != usuario_atual.id
        and any(k != "ativo" for k in update_data)
    ):
        _recusar(
            db, request, usuario_atual,
            tabela="usuarios", registro_id=usuario.id, tentativa="editar",
            status_code=403, detalhe=MSG_CONTA_PRINCIPAL,
        )

    dados_antes = model_to_dict(usuario)
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
    "/{id}/redefinir-senha",
    response_model=UsuarioResponse,
    dependencies=[Depends(require_permission("usuarios.editar"))],
)
def redefinir_senha_de_usuario(
    id: int,
    obj_in: UsuarioRedefinirSenha,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    """Define uma senha provisória para outro usuário, sem exigir a senha antiga.

    É o caminho de volta quando alguém esquece a senha e a recuperação por e-mail não está
    disponível. Exige usuarios.editar, ou seja, na prática um administrador.
    """
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if usuario.protegido and usuario.id != usuario_atual.id:
        # Trocar a senha do dono é tomar a conta dele.
        _recusar(
            db, request, usuario_atual,
            tabela="usuarios", registro_id=usuario.id, tentativa="redefinir-senha",
            status_code=403, detalhe=MSG_CONTA_PRINCIPAL,
        )

    dados_antes = model_to_dict(usuario)
    usuario.senha_hash = hash_password(obj_in.senha_nova)
    usuario.updated_at = datetime.utcnow()

    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="editar",
        tabela="usuarios",
        registro_id=usuario.id,
        # model_to_dict nao inclui senha_hash (ver o proprio helper), entao a auditoria
        # registra que houve redefinicao sem guardar hash nenhum.
        dados_anteriores=dados_antes,
        dados_novos={**model_to_dict(usuario), "senha_redefinida_por_administrador": True},
        ip=obter_ip_cliente(request),
    )
    db.commit()
    db.refresh(usuario)
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
    _exigir_que_pode_desativar(db, request, usuario_atual, usuario)

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
        alvo = db.query(Usuario).filter(Usuario.id == id).first()
        recusa = None
        if id == usuario_atual.id:
            recusa = (403, MSG_REMOVER_PROPRIO_ADMIN)
        elif alvo is not None and alvo.protegido:
            recusa = (403, MSG_CONTA_PRINCIPAL)
        elif _outros_admins_ativos(db, id) == 0:
            recusa = (409, MSG_ULTIMO_ADMIN)
        if recusa:
            _recusar(
                db, request, usuario_atual,
                tabela="usuario_perfis", registro_id=vinculo.id,
                tentativa="remover perfil Administrador",
                status_code=recusa[0], detalhe=recusa[1],
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
