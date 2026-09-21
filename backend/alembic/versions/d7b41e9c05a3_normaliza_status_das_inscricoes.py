"""normaliza o status das inscricoes e passa a restringi-lo no banco

O vocabulario de status virou feminino ("CONFIRMADA") para concordar com "inscricao", mas
as linhas gravadas antes disso ficaram como estavam. A coluna e um String(30) livre, sem
nada que impeca outro valor, entao esses registros antigos sobreviveram.

O estrago aparece na tela: `InscricaoResponse.status` so aceita CONFIRMADA/PENDENTE/
CANCELADA, e uma unica linha legada faz a serializacao levantar ValidationError. A rota
devolve 500 e a tela de detalhes do evento fica presa em "Carregando evento..." para sempre
-- nao so a lista de inscricoes, porque a tela busca as inscricoes junto com o evento.

Alem de normalizar os dados, cria o CHECK que faltava: sem ele o mesmo desencontro entre o
vocabulario do codigo e o do banco volta na proxima renomeacao, e de novo so como 500.

Valores fora do vocabulario nao viram palpite: status de inscricao decide quem tem vaga no
evento, e transformar em "CONFIRMADA" algo que talvez fosse uma recusa e pior do que deixar
a linha como esta e pedir revisao humana.

Mas esta migration tambem nao pode parar o deploy por causa deles. O startCommand do Render
e `alembic upgrade head && uvicorn ...`: uma excecao aqui nao deixa a API subir, ou seja,
uma linha legada derrubaria o sistema inteiro em vez de so a tela do evento dela. Por isso o
CHECK entra como NOT VALID (aceito sempre, mesmo com linhas violando) e a validacao das
linhas antigas e tentada em seguida, dentro de um SAVEPOINT. Se falhar, o CHECK fica valendo
para toda escrita nova e o log do deploy diz exatamente quais valores revisar.

Revision ID: d7b41e9c05a3
Revises: c3d1f0a54e21
Create Date: 2026-09-20

"""
import logging

from alembic import op
import sqlalchemy as sa


revision = "d7b41e9c05a3"
down_revision = "c3d1f0a54e21"
branch_labels = None
depends_on = None

logger = logging.getLogger("alembic.runtime.migration")

STATUS_VALIDOS = ("CONFIRMADA", "PENDENTE", "CANCELADA")

# Formas antigas encontradas no banco de desenvolvimento, mais as variantes masculinas que
# o codigo gravou antes da padronizacao.
EQUIVALENCIAS = {
    "INSCRITO": "CONFIRMADA",
    "INSCRITA": "CONFIRMADA",
    "CONFIRMADO": "CONFIRMADA",
    "CANCELADO": "CANCELADA",
}

NOME_CHECK = "ck_inscricao_status"

_LISTA_VALIDOS = ", ".join(f"'{s}'" for s in STATUS_VALIDOS)


def upgrade() -> None:
    conn = op.get_bind()

    for antigo, novo in EQUIVALENCIAS.items():
        conn.execute(
            sa.text("UPDATE inscricoes SET status = :novo WHERE status = :antigo"),
            {"novo": novo, "antigo": antigo},
        )

    # NOT VALID: passa a valer para INSERT/UPDATE imediatamente, sem exigir que as linhas ja
    # existentes estejam conformes. E o que torna este passo incapaz de falhar.
    conn.execute(
        sa.text(
            f"ALTER TABLE inscricoes ADD CONSTRAINT {NOME_CHECK} "
            f"CHECK (status IN ({_LISTA_VALIDOS})) NOT VALID"
        )
    )

    # O SAVEPOINT isola a tentativa: sem ele, o erro do VALIDATE aborta a transacao inteira
    # da migration no Postgres, inclusive o ALTER TABLE acima.
    ponto = conn.begin_nested()
    try:
        conn.execute(sa.text(f"ALTER TABLE inscricoes VALIDATE CONSTRAINT {NOME_CHECK}"))
        ponto.commit()
    except sa.exc.IntegrityError:
        ponto.rollback()
        restantes = conn.execute(
            sa.text(
                "SELECT DISTINCT status FROM inscricoes WHERE status NOT IN :validos"
            ).bindparams(sa.bindparam("validos", value=STATUS_VALIDOS, expanding=True))
        ).scalars().all()
        logger.warning(
            "Inscricoes com status fora do vocabulario atual (%s) foram mantidas como "
            "estao: nao ha como saber a intencao original. O CHECK %s ficou como NOT VALID "
            "-- ja vale para toda escrita nova, mas essas linhas continuam quebrando a tela "
            "do evento delas. Corrija-as para um de %s e rode "
            "'ALTER TABLE inscricoes VALIDATE CONSTRAINT %s'.",
            ", ".join(sorted(restantes)),
            NOME_CHECK,
            ", ".join(STATUS_VALIDOS),
            NOME_CHECK,
        )


def downgrade() -> None:
    # Os valores antigos nao sao reconstruidos: CONFIRMADA veio tanto de INSCRITO quanto de
    # CONFIRMADO, e nada no banco distingue a origem. So o CHECK sai.
    op.drop_constraint(NOME_CHECK, "inscricoes", type_="check")
