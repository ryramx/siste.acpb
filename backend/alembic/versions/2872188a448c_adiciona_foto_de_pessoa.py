"""adiciona foto de pessoa

Revision ID: 2872188a448c
Revises: 4beefe74b866
Create Date: 2026-09-11 08:39:24.129265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2872188a448c'
down_revision: Union[str, None] = '4beefe74b866'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('pessoas', sa.Column('foto_arquivo', sa.String(length=255), nullable=True))
    op.create_unique_constraint('uq_pessoas_foto_arquivo', 'pessoas', ['foto_arquivo'])


def downgrade() -> None:
    op.drop_constraint('uq_pessoas_foto_arquivo', 'pessoas', type_='unique')
    op.drop_column('pessoas', 'foto_arquivo')
