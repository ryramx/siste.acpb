import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_permissoes_usuario
from app.core.auditoria import obter_ip_cliente, registrar_auditoria
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.core.rate_limit import (
    LimiteDeTentativas,
    chave_de_email,
    exigir_dentro_do_limite,
)
from app.db.session import get_db
from app.core.email import enviar_recuperacao_senha
from app.models.senha_reset_token import SenhaResetToken
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.models.perfil import Perfil
from app.schemas.auth import (
    AlterarSenhaRequest,
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

# Limite de tentativas das duas rotas que respondem sem token. Ver app/core/rate_limit.py para
# o desenho e as limitações; os números vêm de settings.
#
# São dois limites por rota, de propósito, porque contêm ataques diferentes:
# - por e-mail: alguém martelando *uma* conta, venha de quantos IPs vier;
# - por IP: alguém varrendo *muitas* contas a partir do mesmo lugar, que o limite por e-mail
#   não pegaria (cinco tentativas em cada um de mil e-mails nunca estoura a cota de nenhum).
_limite_login_email = LimiteDeTentativas(
    "login-email",
    settings.LOGIN_MAX_FALHAS_POR_EMAIL,
    settings.LOGIN_JANELA_MINUTOS * 60,
)
_limite_login_ip = LimiteDeTentativas(
    "login-ip",
    settings.LOGIN_MAX_FALHAS_POR_IP,
    settings.LOGIN_JANELA_MINUTOS * 60,
)
_limite_recuperacao_email = LimiteDeTentativas(
    "recuperacao-email",
    settings.RECUPERACAO_MAX_POR_EMAIL,
    settings.RECUPERACAO_JANELA_MINUTOS * 60,
)
_limite_recuperacao_ip = LimiteDeTentativas(
    "recuperacao-ip",
    settings.RECUPERACAO_MAX_POR_IP,
    settings.RECUPERACAO_JANELA_MINUTOS * 60,
)


# A troca da própria senha exige a senha atual, então também é um alvo de adivinhação — com a
# diferença de que aqui o atacante já tem um token válido. O limite é por usuário, não por IP:
# é a conta que está sendo atacada.
_limite_alterar_senha = LimiteDeTentativas(
    "alterar-senha",
    settings.LOGIN_MAX_FALHAS_POR_EMAIL,
    settings.LOGIN_JANELA_MINUTOS * 60,
)


def _chave_de_ip(request: Request) -> str:
    # Requisição sem IP identificável não escapa do limite: todas caem na mesma cota
    # "desconhecido", o que é mais restritivo, não menos.
    return obter_ip_cliente(request) or "desconhecido"


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = chave_de_email(dados.email)
    ip = _chave_de_ip(request)

    # Checado antes de tocar no banco: uma tentativa recusada pelo limite não deve custar nem
    # a consulta nem a verificação de senha (o Argon2 é deliberadamente lento, e é justamente
    # esse custo que um ataque em volume transformaria em negação de serviço).
    exigir_dentro_do_limite(
        _limite_login_email, email, "Muitas tentativas de login para este e-mail."
    )
    exigir_dentro_do_limite(
        _limite_login_ip, ip, "Muitas tentativas de login a partir deste dispositivo."
    )

    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()

    # Só a falha é contada, e ela é contada antes de responder: quem acerta a senha nunca é
    # barrado, por mais que tenha errado antes (ver `limpar` abaixo). Inativo entra na conta
    # como qualquer outra recusa — de fora os dois casos são indistinguíveis, e precisam
    # continuar sendo.
    if not usuario or not verify_password(dados.senha, usuario.senha_hash) or not usuario.ativo:
        _limite_login_email.registrar(email)
        _limite_login_ip.registrar(ip)
        logger.warning("Falha de login para email=%s ip=%s", email, ip)
        raise CREDENCIAIS_INVALIDAS

    _limite_login_email.limpar(email)
    _limite_login_ip.limpar(ip)

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


@router.post("/alterar-senha", status_code=status.HTTP_204_NO_CONTENT)
def alterar_propria_senha(
    dados: AlterarSenhaRequest,
    request: Request,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
):
    """Troca da própria senha, com o usuário logado.

    Antes desta rota, o único jeito de trocar a senha era o fluxo de recuperação por e-mail —
    que depende de a caixa de e-mail estar acessível, e que serve para *esquecimento*, não para
    a troca deliberada de quem desconfia que a senha foi vista. Com dezenas de usuários e senha
    inicial definida por um administrador, trocar a senha é operação de rotina.
    """
    chave = str(usuario_atual.id)
    exigir_dentro_do_limite(
        _limite_alterar_senha, chave, "Muitas tentativas de troca de senha nesta conta."
    )

    if not verify_password(dados.senha_atual, usuario_atual.senha_hash):
        _limite_alterar_senha.registrar(chave)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A senha atual está incorreta"
        )

    if dados.senha_nova == dados.senha_atual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha precisa ser diferente da atual",
        )

    usuario_atual.senha_hash = hash_password(dados.senha_nova)
    usuario_atual.updated_at = datetime.utcnow()

    # Tokens de recuperação pendentes morrem aqui. Quem troca a senha porque desconfia da conta
    # não ganharia nada se um link de redefinição pedido antes continuasse valendo por meia
    # hora — seria justamente o caminho de volta para quem tomou a caixa de e-mail.
    db.query(SenhaResetToken).filter(
        SenhaResetToken.usuario_id == usuario_atual.id,
        SenhaResetToken.usado_em.is_(None),
    ).update({SenhaResetToken.usado_em: datetime.utcnow()})

    # Sem dados_anteriores/dados_novos: o que mudou é o hash da senha, que não entra em
    # auditoria (ver CAMPOS_SENSIVEIS). O que importa registrar é que houve a troca, por quem
    # e de onde.
    registrar_auditoria(
        db,
        usuario_id=usuario_atual.id,
        acao="editar",
        tabela="usuarios",
        registro_id=usuario_atual.id,
        descricao="Alteração da própria senha",
        ip=obter_ip_cliente(request),
    )
    db.commit()
    _limite_alterar_senha.limpar(chave)

    # O token atual continua valendo: JWT é stateless e não há blacklist (ver AUTENTICACAO.md).
    # Trocar a senha não derruba as sessões já abertas — inclusive a de quem trocou, que não
    # seria bom deslogar no meio do trabalho. Revogar sessões exige o token de refresh que a v1
    # não tem, e está registrado como evolução futura.
    return None


@router.post("/recuperar-senha", status_code=status.HTTP_202_ACCEPTED)
def solicitar_recuperacao_senha(
    dados: SolicitarRecuperacaoSenhaRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = chave_de_email(dados.email)
    ip = _chave_de_ip(request)

    exigir_dentro_do_limite(
        _limite_recuperacao_email,
        email,
        "Já foram pedidas várias recuperações de senha para este e-mail.",
    )
    exigir_dentro_do_limite(
        _limite_recuperacao_ip,
        ip,
        "Muitos pedidos de recuperação de senha a partir deste dispositivo.",
    )
    # Registrado antes de saber se o e-mail existe — o contrário revelaria a existência da
    # conta: e-mail cadastrado seria limitado e e-mail inventado não, o que é exatamente a
    # enumeração que a resposta idêntica evita.
    _limite_recuperacao_email.registrar(email)
    _limite_recuperacao_ip.registrar(ip)

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

        enviado = enviar_recuperacao_senha(usuario.email, token_bruto)
        if enviado:
            # Nunca logar o token em si: o log registra apenas que houve envio.
            logger.info(
                "E-mail de recuperação de senha enviado para usuario_id=%s (expira em %s)",
                usuario.id,
                expira_em.isoformat(),
            )
        else:
            # Só acontece em desenvolvimento: em produção a aplicação nem sobe sem SMTP
            # configurado (ver app/core/config.py::_validar_configuracao_producao).
            logger.warning(
                "SMTP não configurado — token de recuperação para usuario_id=%s registrado "
                "apenas em log (ambiente=%s): %s (expira em %s)",
                usuario.id,
                settings.ENVIRONMENT,
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
