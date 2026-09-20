"""adiciona bairro e cep em pessoas

O frontend ja exibia bairro e CEP na ficha da pessoa, mas o backend nunca teve essas
colunas: o servico preenchia os dois com string vazia, resquicio da fase de dados
ficticios. O resultado era um traco solto e um "CEP:" permanentemente vazio na tela.

Com a busca por CEP no formulario, os dois passam a ser dados de verdade.

Aditiva e nullable: nenhum registro existente precisa ser migrado.

Revision ID: 57048156660a
Revises: a1c4e7f2b930
Create Date: 2026-09-20 11:56:37.657717

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57048156660a'
down_revision: Union[str, None] = 'a1c4e7f2b930'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pessoas', sa.Column('bairro', sa.String(length=100), nullable=True))
    op.add_column('pessoas', sa.Column('cep', sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column('pessoas', 'cep')
    op.drop_column('pessoas', 'bairro')
