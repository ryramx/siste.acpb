"""adiciona responsavel legal de menor em pessoas

O PRD pede, no cadastro de membro, "responsável, caso seja menor". A associação atende
crianças e adolescentes nos projetos (Jiu-jitsu e Corrida, citados no questionário), então
sem esse dado não há a quem recorrer numa emergência durante a atividade.

Dois campos e não um: o nome sozinho não resolve o caso de uso real, que é conseguir falar
com alguém. Texto livre, e não FK para `pessoas`: o responsável costuma ser mãe, avó ou tio
que não tem cadastro próprio na associação, e exigir cadastrá-lo antes travaria a inscrição
da criança.

Ficam em `pessoas`, e não em `membros`, porque a condição de ser menor é da pessoa: vale
igualmente para um beneficiário ou um inscrito em evento, não só para membro.

Colunas anuláveis, sem preenchimento retroativo: a esmagadora maioria das pessoas é adulta,
e adivinhar responsável a partir de `nome_mae` seria inventar uma informação legal.

Revision ID: a83f14d7e2b6
Revises: f1a7c25b93d4
Create Date: 2026-09-23

"""
from alembic import op
import sqlalchemy as sa


revision = "a83f14d7e2b6"
down_revision = "f1a7c25b93d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pessoas", sa.Column("responsavel_nome", sa.String(length=150), nullable=True))
    op.add_column(
        "pessoas",
        # Guarda só dígitos, como os demais telefones do sistema (ver utils/mascaras.ts):
        # misturar "(81) 99999-9999" e "81999999999" na mesma coluna torna busca e comparação
        # pouco confiáveis, e é inconsistência que só aparece depois de haver dados dos dois
        # formatos.
        sa.Column("responsavel_telefone", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pessoas", "responsavel_telefone")
    op.drop_column("pessoas", "responsavel_nome")
