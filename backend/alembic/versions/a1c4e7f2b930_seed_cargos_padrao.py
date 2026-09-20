"""seed dos cargos padrao da associacao

A migration baseline cria a tabela `cargos` mas nunca a popula, e nao existe tela para
cadastrar cargos — so a API. Numa instalacao nova isso trava o sistema: o campo "Cargo" do
formulario de membro e obrigatorio e fica permanentemente vazio, entao nenhum membro pode
ser cadastrado.

Os valores abaixo sao os que a associacao ja usava no banco de desenvolvimento.

Idempotente via ON CONFLICT (nome), como o seed de RBAC: rodar de novo num banco que ja
tem os cargos nao duplica nem falha.

Revision ID: a1c4e7f2b930
Revises: 8c8e37a26f1d
Create Date: 2026-09-20

"""
from alembic import op
import sqlalchemy as sa


revision = "a1c4e7f2b930"
down_revision = "8c8e37a26f1d"
branch_labels = None
depends_on = None


CARGOS = [
    ("Presidente", "Responsável pela presidência da associação"),
    ("Vice-presidente", "Auxilia e substitui a presidência"),
    ("Secretário", "Responsável pelas atividades de secretaria"),
    ("Tesoureiro", "Responsável pela gestão financeira"),
    ("Coordenador", "Responsável pela coordenação de atividades e projetos"),
    ("Membro", "Membro da associação"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for nome, descricao in CARGOS:
        conn.execute(
            sa.text(
                """
                INSERT INTO cargos (nome, descricao, ativo, created_at, updated_at)
                VALUES (:nome, :descricao, true, now(), now())
                ON CONFLICT (nome) DO NOTHING
                """
            ),
            {"nome": nome, "descricao": descricao},
        )


def downgrade() -> None:
    conn = op.get_bind()
    # Remove apenas cargos que nenhum membro usa. Um cargo em uso nao pode sumir: a FK
    # impediria de qualquer forma, mas falhar com erro de constraint no meio de um
    # downgrade deixaria a migration pela metade.
    conn.execute(
        sa.text(
            """
            DELETE FROM cargos
            WHERE nome = ANY(:nomes)
              AND NOT EXISTS (SELECT 1 FROM membros WHERE membros.cargo_id = cargos.id)
            """
        ),
        {"nomes": [nome for nome, _ in CARGOS]},
    )
