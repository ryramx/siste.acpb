"""seed das categorias financeiras previstas no PRD

A tabela `categorias_financeiras` nasce vazia da baseline. Até haver tela para cadastrá-las
isso travava o financeiro inteiro: o formulário de lançamento abria com a lista de categoria
vazia e não havia como preenchê-la por lugar nenhum.

A tela já existe (Financeiro > Categorias e contas), mas começar com a lista em branco
continua sendo um mau ponto de partida — são vinte categorias para digitar antes do primeiro
lançamento. Os valores abaixo são os nomeados no PRD, seções 15.1 e 15.2.

A associação, no questionário (8.3), citou só quatro despesas reais: Aluguel, Materiais de
Limpeza, Energia Elétrica e Água — todas presentes aqui. As demais vêm do PRD e podem ser
desativadas pela tela, o que as tira das listas de lançamento sem apagar nada. Desativar é
mais barato que digitar uma que falta no meio do expediente.

`nome` tem restrição de unicidade, então o ON CONFLICT torna esta migration idempotente:
rodar de novo num banco que já as tem não duplica nem falha. Isso importa porque o plano
gratuito do Render reexecuta `alembic upgrade head` a cada vez que o serviço acorda.

Revision ID: f1a7c25b93d4
Revises: e5a2c1d84f37
Create Date: 2026-09-23

"""
from alembic import op
import sqlalchemy as sa


revision = "f1a7c25b93d4"
down_revision = "e5a2c1d84f37"
branch_labels = None
depends_on = None


# (nome, tipo, descricao) — tipo segue o vocabulário do banco: ENTRADA/SAIDA.
CATEGORIAS = [
    # PRD 15.1 — receitas
    ("Doações", "ENTRADA", "Valores doados à associação"),
    ("Contribuições", "ENTRADA", "Contribuições de membros"),
    ("Patrocínios", "ENTRADA", "Patrocínio de empresas ou parceiros"),
    ("Convênios", "ENTRADA", "Repasses de convênios firmados"),
    ("Eventos", "ENTRADA", "Arrecadação proveniente de eventos"),
    ("Outras receitas", "ENTRADA", "Entradas que não se encaixam nas demais categorias"),
    # PRD 15.2 — despesas
    ("Aluguel", "SAIDA", "Aluguel da sede"),
    ("Energia elétrica", "SAIDA", "Conta de luz"),
    ("Água", "SAIDA", "Conta de água"),
    ("Internet", "SAIDA", "Serviço de internet e telefonia"),
    ("Material de limpeza", "SAIDA", "Produtos de limpeza e higiene"),
    ("Material de escritório", "SAIDA", "Papelaria e suprimentos administrativos"),
    ("Alimentação", "SAIDA", "Alimentos e refeições"),
    ("Transporte", "SAIDA", "Deslocamentos, combustível e fretes"),
    ("Manutenção", "SAIDA", "Reparos e conservação"),
    ("Equipamentos", "SAIDA", "Compra de equipamentos"),
    ("Projetos sociais", "SAIDA", "Gastos diretos dos projetos"),
    ("Contabilidade", "SAIDA", "Serviços contábeis"),
    ("Impostos e taxas", "SAIDA", "Tributos e taxas"),
    ("Outras despesas", "SAIDA", "Saídas que não se encaixam nas demais categorias"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for nome, tipo, descricao in CATEGORIAS:
        conn.execute(
            sa.text(
                """
                INSERT INTO categorias_financeiras (nome, tipo, descricao, ativo, created_at, updated_at)
                VALUES (:nome, :tipo, :descricao, true, now(), now())
                ON CONFLICT (nome) DO NOTHING
                """
            ),
            {"nome": nome, "tipo": tipo, "descricao": descricao},
        )


def downgrade() -> None:
    conn = op.get_bind()
    # Só remove categoria que nenhum lançamento usa. Uma categoria em uso levaria o
    # histórico financeiro junto, e a FK falharia no meio do downgrade — deixando a
    # migration pela metade. Mesmo cuidado do seed de cargos.
    conn.execute(
        sa.text(
            """
            DELETE FROM categorias_financeiras
            WHERE nome = ANY(:nomes)
              AND NOT EXISTS (
                SELECT 1 FROM movimentacoes_financeiras
                WHERE movimentacoes_financeiras.categoria_id = categorias_financeiras.id
              )
            """
        ),
        {"nomes": [nome for nome, _, _ in CATEGORIAS]},
    )
