"""adiciona vinculo entre projeto e beneficiario

Revision ID: c3d1f0a54e21
Revises: 57048156660a
Create Date: 2026-09-20 10:12:44.108312

Cria a tabela `projeto_beneficiarios` (tarefa 30), espelhando `projeto_voluntarios`: o projeto
passa a registrar quem ele atende, e nao apenas quem trabalha nele. Ate aqui o beneficiario so
se ligava ao projeto indiretamente, via `atendimentos`, o que nao permitia vincular alguem antes
do primeiro atendimento.

Nao semeia permissoes: gerenciar a equipe e o publico de um projeto e uma edicao do projeto, entao
as rotas reusam `projetos.visualizar` e `projetos.editar`, que ja existem desde o seed de RBAC.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d1f0a54e21'
down_revision: Union[str, None] = '57048156660a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('projeto_beneficiarios',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('projeto_id', sa.BigInteger(), nullable=False),
    sa.Column('beneficiario_id', sa.BigInteger(), nullable=False),
    sa.Column('papel', sa.String(length=150), nullable=True),
    sa.Column('data_entrada', sa.Date(), nullable=True),
    sa.Column('data_saida', sa.Date(), nullable=True),
    sa.Column('observacoes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['beneficiario_id'], ['beneficiarios.id'], ),
    sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('projeto_id', 'beneficiario_id', name='uq_projeto_beneficiario')
    )


def downgrade() -> None:
    op.drop_table('projeto_beneficiarios')
