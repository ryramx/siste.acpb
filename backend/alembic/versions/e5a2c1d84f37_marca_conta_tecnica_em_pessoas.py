"""marca contas tecnicas em pessoas

O sistema tem contas que existem para opera-lo, nao para participar da associacao: a conta de
desenvolvimento, e no futuro qualquer integracao ou suporte. Elas apareciam misturadas com as
pessoas reais em toda lista de escolher alguem -- inscrever num evento, vincular a um projeto,
definir responsavel por um bem -- e podiam ser envolvidas por engano numa atividade.

Uma marca na propria Pessoa, em vez de filtrar por nome no codigo: o nome muda, e a proxima
conta tecnica teria o mesmo problema de novo.

Nao tenta adivinhar quais linhas sao tecnicas. Toda pessoa existente continua como esta
(`false`), e a marcacao e feita pela tela de usuarios, por quem sabe quais contas sao de
operacao.

Revision ID: e5a2c1d84f37
Revises: d7b41e9c05a3
Create Date: 2026-09-23

"""
from alembic import op
import sqlalchemy as sa


revision = "e5a2c1d84f37"
down_revision = "d7b41e9c05a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # server_default garante que as linhas existentes recebam `false` sem um UPDATE explicito,
    # e que insercoes feitas fora da aplicacao continuem validas.
    op.add_column(
        "pessoas",
        sa.Column(
            "conta_tecnica",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("pessoas", "conta_tecnica")
