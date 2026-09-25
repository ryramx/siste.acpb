"""marca a conta principal em usuarios

Qualquer administrador podia desativar outro, inclusive o dono do sistema, e o script de
recuperacao (`scripts/criar_admin.py`) se recusa a rodar enquanto houver algum admin ativo.
Ou seja: se um admin desativasse o dono, o dono ficava sem caminho de volta.

A conta marcada como `protegido` so pode ser alterada por ela mesma: ninguem mais a desativa,
troca o e-mail, redefine a senha ou remove o perfil de Administrador (ver
app/api/routes/usuarios.py).

Nao tenta adivinhar qual linha e a do dono. Toda conta existente continua como esta (`false`),
e a marcacao e feita por `scripts/proteger_conta.py`, rodado no shell do servidor por quem tem
acesso a ele. De proposito nao ha rota nem tela para isso: se um admin pudesse marcar ou
desmarcar, poderia tambem desproteger o dono.

Revision ID: a3c8e61f2b90
Revises: a83f14d7e2b6
Create Date: 2026-09-25

"""
from alembic import op
import sqlalchemy as sa


revision = "a3c8e61f2b90"
down_revision = "a83f14d7e2b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "protegido",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "protegido")
