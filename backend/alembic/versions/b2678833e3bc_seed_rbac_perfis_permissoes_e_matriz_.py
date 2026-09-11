"""seed rbac: perfis, permissoes e matriz perfil_permissoes

Revision ID: b2678833e3bc
Revises: fde3b921d4fc
Create Date: 2026-09-11 01:28:15.070733

Ver backend/RBAC.md para a matriz completa e a justificativa de cada vínculo. Esta migration é
idempotente (usa ON CONFLICT DO NOTHING) para poder rodar tanto em um banco novo (cria os 6 perfis
e as 29 permissões do zero) quanto no banco de desenvolvimento existente (que já tinha perfis e
permissões cadastrados, mas nenhum vínculo em perfil_permissoes).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2678833e3bc'
down_revision: Union[str, None] = 'fde3b921d4fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PERFIS = [
    ("Administrador", "Acesso total ao sistema"),
    ("Gestor", "Gestão operacional de cadastros, projetos e financeiro, sem administrar usuários"),
    ("Secretário", "Cadastro de pessoas, membros, voluntários, beneficiários, eventos e inscrições"),
    ("Financeiro", "Gestão do módulo financeiro"),
    ("Coordenador", "Coordenação de projetos, eventos, inscrições e voluntários"),
    ("Voluntário", "Consulta de projetos/eventos e autoinscrição em eventos"),
]

# (modulo, acao) -> ordem usada apenas para gerar a descrição padrão das permissões já existentes
PERMISSOES = [
    ("pessoas", "visualizar"), ("pessoas", "criar"), ("pessoas", "editar"), ("pessoas", "excluir"),
    ("membros", "visualizar"), ("membros", "criar"), ("membros", "editar"),
    ("voluntarios", "visualizar"), ("voluntarios", "criar"), ("voluntarios", "editar"),
    ("beneficiarios", "visualizar"), ("beneficiarios", "criar"), ("beneficiarios", "editar"),
    ("projetos", "visualizar"), ("projetos", "criar"), ("projetos", "editar"),
    ("eventos", "visualizar"), ("eventos", "criar"), ("eventos", "editar"),
    ("inscricoes", "visualizar"), ("inscricoes", "criar"), ("inscricoes", "editar"),
    ("financeiro", "visualizar"), ("financeiro", "criar"), ("financeiro", "editar"),
    ("usuarios", "visualizar"), ("usuarios", "criar"), ("usuarios", "editar"),
    ("auditoria", "visualizar"),
]

TODAS_ACOES_POR_MODULO: dict[str, list[str]] = {}
for modulo, acao in PERMISSOES:
    TODAS_ACOES_POR_MODULO.setdefault(modulo, []).append(acao)

# Matriz perfil -> lista de (modulo, acao). Ver backend/RBAC.md para a justificativa.
MATRIZ: dict[str, list[tuple[str, str]]] = {
    "Administrador": list(PERMISSOES),
    "Gestor": [
        (m, a)
        for m in ["pessoas", "membros", "voluntarios", "beneficiarios", "projetos", "eventos", "inscricoes", "financeiro"]
        for a in ["visualizar", "criar", "editar"]
        if a in TODAS_ACOES_POR_MODULO[m]
    ],
    "Secretário": [
        (m, a)
        for m in ["pessoas", "membros", "voluntarios", "beneficiarios", "eventos", "inscricoes"]
        for a in ["visualizar", "criar", "editar"]
        if a in TODAS_ACOES_POR_MODULO[m]
    ] + [("projetos", "visualizar")],
    "Financeiro": [("financeiro", a) for a in ["visualizar", "criar", "editar"]]
    + [(m, "visualizar") for m in ["pessoas", "membros", "voluntarios", "beneficiarios", "projetos"]],
    "Coordenador": [
        (m, a)
        for m in ["projetos", "eventos", "inscricoes", "voluntarios"]
        for a in ["visualizar", "criar", "editar"]
    ] + [(m, "visualizar") for m in ["pessoas", "membros", "beneficiarios"]],
    "Voluntário": [("eventos", "visualizar"), ("projetos", "visualizar"), ("inscricoes", "visualizar"), ("inscricoes", "criar")],
}


def upgrade() -> None:
    conn = op.get_bind()

    for nome, descricao in PERFIS:
        conn.execute(
            sa.text(
                """
                INSERT INTO perfis (nome, descricao, ativo, created_at, updated_at)
                VALUES (:nome, :descricao, true, now(), now())
                ON CONFLICT (nome) DO NOTHING
                """
            ),
            {"nome": nome, "descricao": descricao},
        )

    for modulo, acao in PERMISSOES:
        conn.execute(
            sa.text(
                """
                INSERT INTO permissoes (nome, descricao, modulo, acao, ativo, created_at, updated_at)
                VALUES (:nome, :descricao, :modulo, :acao, true, now(), now())
                ON CONFLICT (nome) DO NOTHING
                """
            ),
            {
                "nome": f"{modulo}.{acao}",
                "descricao": f"Permite {acao} em {modulo}",
                "modulo": modulo,
                "acao": acao,
            },
        )

    for perfil_nome, pares in MATRIZ.items():
        for modulo, acao in pares:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO perfil_permissoes (perfil_id, permissao_id, created_at)
                    SELECT p.id, pm.id, now()
                    FROM perfis p, permissoes pm
                    WHERE p.nome = :perfil_nome AND pm.modulo = :modulo AND pm.acao = :acao
                    ON CONFLICT (perfil_id, permissao_id) DO NOTHING
                    """
                ),
                {"perfil_nome": perfil_nome, "modulo": modulo, "acao": acao},
            )


def downgrade() -> None:
    conn = op.get_bind()
    # Remove apenas os vínculos criados por esta migration (perfis/permissões podem ter sido
    # pré-existentes no banco e não são apagados no downgrade).
    for perfil_nome, pares in MATRIZ.items():
        for modulo, acao in pares:
            conn.execute(
                sa.text(
                    """
                    DELETE FROM perfil_permissoes
                    USING perfis p, permissoes pm
                    WHERE perfil_permissoes.perfil_id = p.id
                      AND perfil_permissoes.permissao_id = pm.id
                      AND p.nome = :perfil_nome AND pm.modulo = :modulo AND pm.acao = :acao
                    """
                ),
                {"perfil_nome": perfil_nome, "modulo": modulo, "acao": acao},
            )
