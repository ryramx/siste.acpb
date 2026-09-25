"""indice da data das movimentacoes financeiras

As telas do financeiro passam a filtrar por ano e mes (RQ-07 da rodada de QA de 25/09/2026),
com `data_movimentacao >= inicio AND < fim`. Com o indice, a consulta de um periodo nao precisa
ler a tabela inteira conforme os anos de lancamento se acumulam.

Revision ID: b7d2f4a91c36
Revises: a3c8e61f2b90
Create Date: 2026-09-25

"""
from alembic import op


revision = "b7d2f4a91c36"
down_revision = "a3c8e61f2b90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_movimentacoes_financeiras_data_movimentacao",
        "movimentacoes_financeiras",
        ["data_movimentacao"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_movimentacoes_financeiras_data_movimentacao",
        table_name="movimentacoes_financeiras",
    )
