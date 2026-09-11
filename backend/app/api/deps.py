from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import TokenInvalido, decode_access_token
from app.db.session import get_db
from app.models.perfil import Perfil
from app.models.perfil_permissao import PerfilPermissao
from app.models.permissao import Permissao
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

CREDENCIAIS_NAO_AUTORIZADAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token inválido ou expirado",
    headers={"WWW-Authenticate": "Bearer"},
)


class Bearer401(HTTPBearer):
    """HTTPBearer que responde 401 (não 403) quando o header Authorization está ausente,
    conforme exigido pela tarefa 10: chamada sem token deve receber 401."""

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials:
        try:
            return await super().__call__(request)
        except HTTPException as exc:
            raise CREDENCIAIS_NAO_AUTORIZADAS from exc


bearer_scheme = Bearer401(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    try:
        payload = decode_access_token(credentials.credentials)
    except TokenInvalido:
        raise CREDENCIAIS_NAO_AUTORIZADAS

    usuario_id = payload.get("sub")
    if usuario_id is None:
        raise CREDENCIAIS_NAO_AUTORIZADAS

    # Sempre consulta o estado atual no banco (não confia apenas no payload do token),
    # para que a desativação de um usuário tenha efeito imediato (ver AUTENTICACAO.md).
    usuario = db.query(Usuario).filter(Usuario.id == int(usuario_id)).first()
    if usuario is None or not usuario.ativo:
        raise CREDENCIAIS_NAO_AUTORIZADAS

    return usuario


def get_permissoes_usuario(usuario: Usuario, db: Session) -> set[str]:
    """Resolve o conjunto de permissões (`modulo.acao`) do usuário via seus perfis ativos.
    Ver backend/RBAC.md para a matriz completa."""
    linhas = (
        db.query(Permissao.modulo, Permissao.acao)
        .join(PerfilPermissao, PerfilPermissao.permissao_id == Permissao.id)
        .join(Perfil, Perfil.id == PerfilPermissao.perfil_id)
        .join(UsuarioPerfil, UsuarioPerfil.perfil_id == Perfil.id)
        .filter(UsuarioPerfil.usuario_id == usuario.id)
        .filter(Perfil.ativo.is_(True))
        .filter(Permissao.ativo.is_(True))
        .all()
    )
    return {f"{modulo}.{acao}" for modulo, acao in linhas}


def require_permission(permissao: str):
    """Dependência FastAPI que exige a permissão `modulo.acao` informada. Usuário autenticado sem
    a permissão recebe 403 (401 já foi tratado por get_current_user para token ausente/inválido)."""

    def dependency(
        usuario: Usuario = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Usuario:
        permissoes = get_permissoes_usuario(usuario, db)
        if permissao not in permissoes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Usuário não tem a permissão '{permissao}' necessária para esta operação",
            )
        return usuario

    return dependency
