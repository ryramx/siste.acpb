"""Cria o primeiro usuário administrador de uma instalação nova.

Sem isto, um banco recém-migrado fica num impasse: a migration de RBAC semeia perfis e
permissões, mas nenhum usuário. Como todas as rotas de criação de usuário exigem estar
autenticado e com permissão, não há como entrar no sistema nem como criar quem entre.

Uso (as credenciais vêm do ambiente, nunca da linha de comando — argumentos ficam
visíveis no histórico do shell e na lista de processos):

    ADMIN_EMAIL=admin@acpb.org.br \
    ADMIN_SENHA='...' \
    ADMIN_NOME='Nome Completo' \
    python -m scripts.criar_admin

Por segurança, o script se recusa a rodar se já existir qualquer administrador ativo:
rodar de novo não pode virar um caminho para escalar privilégio ou trocar a senha de um
admin existente. Para esses casos, use o CRUD de usuários pelo sistema.
"""

import os
import sys
from datetime import datetime

# Permite `python scripts/criar_admin.py` além de `python -m scripts.criar_admin`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.perfil import Perfil  # noqa: E402
from app.models.pessoa import Pessoa  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402
from app.models.usuario_perfil import UsuarioPerfil  # noqa: E402

PERFIL_ADMIN = "Administrador"
SENHA_TAMANHO_MINIMO = 8


def _erro(mensagem: str) -> None:
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    email = (os.getenv("ADMIN_EMAIL") or "").strip()
    senha = os.getenv("ADMIN_SENHA") or ""
    nome = (os.getenv("ADMIN_NOME") or "").strip()

    if not email or not senha or not nome:
        _erro("defina ADMIN_EMAIL, ADMIN_SENHA e ADMIN_NOME no ambiente")
    if len(senha) < SENHA_TAMANHO_MINIMO:
        # Mesmo mínimo exigido pelo schema de usuário da API.
        _erro(f"ADMIN_SENHA deve ter ao menos {SENHA_TAMANHO_MINIMO} caracteres")

    db = SessionLocal()
    try:
        perfil_admin = db.query(Perfil).filter(Perfil.nome == PERFIL_ADMIN).first()
        if not perfil_admin:
            _erro(
                f"perfil '{PERFIL_ADMIN}' não existe. Rode as migrations primeiro: "
                "alembic upgrade head"
            )

        ja_existe = (
            db.query(Usuario)
            .join(UsuarioPerfil, UsuarioPerfil.usuario_id == Usuario.id)
            .filter(UsuarioPerfil.perfil_id == perfil_admin.id, Usuario.ativo.is_(True))
            .first()
        )
        if ja_existe:
            _erro(
                f"já existe administrador ativo ({ja_existe.email}). Este script só cria o "
                "primeiro; para os demais, use o cadastro de usuários pelo sistema."
            )

        if db.query(Usuario).filter(Usuario.email == email).first():
            _erro(f"já existe um usuário com o e-mail {email}")

        agora = datetime.utcnow()
        pessoa = Pessoa(nome_completo=nome, created_at=agora, updated_at=agora)
        db.add(pessoa)
        db.flush()

        usuario = Usuario(
            pessoa_id=pessoa.id,
            email=email,
            senha_hash=hash_password(senha),
            ativo=True,
            created_at=agora,
            updated_at=agora,
        )
        db.add(usuario)
        db.flush()

        db.add(
            UsuarioPerfil(
                usuario_id=usuario.id, perfil_id=perfil_admin.id, created_at=agora
            )
        )
        db.commit()
    finally:
        db.close()

    # A senha nunca é ecoada, nem em caso de sucesso.
    print(f"OK: administrador criado ({email}). Troque a senha no primeiro acesso.")


if __name__ == "__main__":
    main()
