import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_permissoes_usuario
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.session import get_db
from app.models.senha_reset_token import SenhaResetToken
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.models.perfil import Perfil
from app.schemas.auth import (
    ConfirmarRecuperacaoSenhaRequest,
    LoginRequest,
    MeResponse,
    SolicitarRecuperacaoSenhaRequest,
    TokenResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

CREDENCIAIS_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="E-mail ou senha inválidos",
)


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()

    if not usuario or not verify_password(dados.senha, usuario.senha_hash):
        raise CREDENCIAIS_INVALIDAS

    if not usuario.ativo:
        raise CREDENCIAIS_INVALIDAS

    usuario.ultimo_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(subject=str(usuario.id))
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=MeResponse)
def obter_usuario_atual(
    db: Session = Depends(get_db), usuario_atual: Usuario = Depends(get_current_user)
):
    permissoes = sorted(get_permissoes_usuario(usuario_atual, db))
    perfis = (
        db.query(Perfil.nome)
        .join(UsuarioPerfil, UsuarioPerfil.perfil_id == Perfil.id)
        .filter(UsuarioPerfil.usuario_id == usuario_atual.id)
        .all()
    )

    return MeResponse(
        id=usuario_atual.id,
        pessoa_id=usuario_atual.pessoa_id,
        email=usuario_atual.email,
        nome_completo=usuario_atual.pessoa.nome_completo,
        tem_foto=usuario_atual.pessoa.tem_foto,
        perfis=[nome for (nome,) in perfis],
        permissoes=permissoes,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    # Política de autenticação (backend/AUTENTICACAO.md): tokens JWT são stateless e não há
    # blacklist no servidor na v1 — o logout é responsabilidade do cliente, que descarta o token.
    return None


@router.post("/recuperar-senha", status_code=status.HTTP_202_ACCEPTED)
def solicitar_recuperacao_senha(
    dados: SolicitarRecuperacaoSenhaRequest, db: Session = Depends(get_db)
):
    # Resposta idêntica exista ou não o e-mail, para não permitir enumeração de contas
    # (ver AUTENTICACAO.md). Qualquer diferença de comportamento fica só nos efeitos internos.
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()

    if usuario and usuario.ativo:
        token_bruto, token_hash = generate_reset_token()
        expira_em = datetime.utcnow() + timedelta(
            minutes=settings.RESET_PASSWORD_TOKEN_EXPIRE_MINUTES
        )
        db.add(
            SenhaResetToken(
                usuario_id=usuario.id,
                token_hash=token_hash,
                expires_at=expira_em,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()

        # Sem provedor de e-mail configurado na v1 (ver tarefa 14): o token é registrado em log
        # para uso manual/desenvolvimento. Quando um provedor for integrado, substituir por envio
        # real e remover o log do token em texto puro.
        logger.info(
            "Token de recuperação de senha gerado para usuario_id=%s: %s (expira em %s)",
            usuario.id,
            token_bruto,
            expira_em.isoformat(),
        )

    return {"detail": "Se o e-mail existir, instruções de recuperação foram enviadas"}


@router.post("/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
def confirmar_recuperacao_senha(
    dados: ConfirmarRecuperacaoSenhaRequest, db: Session = Depends(get_db)
):
    token_hash = hash_reset_token(dados.token)
    reset_token = (
        db.query(SenhaResetToken).filter(SenhaResetToken.token_hash == token_hash).first()
    )

    token_invalido = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Token de recuperação inválido, expirado ou já utilizado",
    )

    if not reset_token:
        raise token_invalido
    if reset_token.usado_em is not None:
        raise token_invalido
    if reset_token.expires_at < datetime.utcnow():
        raise token_invalido

    usuario = db.query(Usuario).filter(Usuario.id == reset_token.usuario_id).first()
    if not usuario or not usuario.ativo:
        raise token_invalido

    usuario.senha_hash = hash_password(dados.senha_nova)
    usuario.updated_at = datetime.utcnow()
    reset_token.usado_em = datetime.utcnow()
    db.commit()
    return None
