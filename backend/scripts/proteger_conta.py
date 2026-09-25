"""Marca (ou desmarca) um usuário como a conta principal do sistema.

A conta principal só pode ser alterada por ela mesma: nenhum outro administrador a desativa,
troca o e-mail, redefine a senha ou remove o perfil de Administrador dela. Serve para que o
dono do sistema não perca o acesso por ação de outro admin — o script de recuperação
(`criar_admin`) não ajuda nesse caso, porque se recusa a rodar enquanto houver algum admin
ativo.

Não existe rota nem tela para isto de propósito: se um administrador pudesse marcar ou
desmarcar pela API, poderia também desproteger o dono. Quem tem o shell do servidor já tem
acesso total ao banco, então a marcação fica aqui.

Uso (no shell do Render, aba "Shell" do serviço da API):

    CONTA_EMAIL=dono@acpb.org.br python -m scripts.proteger_conta
    CONTA_EMAIL=dono@acpb.org.br python -m scripts.proteger_conta --remover

A conta precisa estar ativa e ter o perfil Administrador para ser marcada.
"""

import os
import sys
from datetime import datetime

# Permite `python scripts/proteger_conta.py` além de `python -m scripts.proteger_conta`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal  # noqa: E402
from app.models.perfil import Perfil  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402
from app.models.usuario_perfil import UsuarioPerfil  # noqa: E402

PERFIL_ADMIN = "Administrador"


def _erro(mensagem: str) -> None:
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def main(argv: list[str]) -> None:
    remover = "--remover" in argv
    email = (os.getenv("CONTA_EMAIL") or "").strip()
    if not email:
        _erro("defina CONTA_EMAIL no ambiente")

    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            _erro(f"nenhum usuário com o e-mail {email}")

        if not remover:
            if not usuario.ativo:
                _erro(f"{email} está inativo; reative antes de marcar como conta principal")
            eh_admin = (
                db.query(UsuarioPerfil)
                .join(Perfil, Perfil.id == UsuarioPerfil.perfil_id)
                .filter(UsuarioPerfil.usuario_id == usuario.id, Perfil.nome == PERFIL_ADMIN)
                .first()
            )
            if not eh_admin:
                _erro(f"{email} não tem o perfil {PERFIL_ADMIN}")

        usuario.protegido = not remover
        usuario.updated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()

    if remover:
        print(f"OK: {email} deixou de ser conta principal.")
    else:
        print(f"OK: {email} agora é conta principal; só ela mesma pode se alterar.")


if __name__ == "__main__":
    main(sys.argv[1:])
