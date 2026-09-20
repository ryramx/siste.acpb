import os

# Precisa ser definido antes de qualquer import de app.core.config, para que
# Settings carregue .env.test em vez de .env (banco de desenvolvimento).
os.environ["ENVIRONMENT"] = "test"

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

import app.models  # noqa: F401 - registra todos os models em Base.metadata
from app.core.config import settings

EXPECTED_TEST_DATABASE = "acpb_db_test"


def _assert_using_test_database() -> None:
    if settings.DATABASE_NAME != EXPECTED_TEST_DATABASE:
        raise RuntimeError(
            "Suíte de testes recusou-se a rodar: settings.DATABASE_NAME="
            f"'{settings.DATABASE_NAME}', mas era esperado "
            f"'{EXPECTED_TEST_DATABASE}'. Configure backend/.env.test "
            "(veja .env.test.example) para evitar que os testes rodem "
            "contra o banco de desenvolvimento."
        )


_assert_using_test_database()


@pytest.fixture(scope="session", autouse=True)
def _test_database_schema():
    """Coloca acpb_db_test no schema atual antes da suíte rodar, via migrations.

    Antes isto era `Base.metadata.create_all()`, que tem dois problemas: não altera tabelas
    que já existem (uma coluna nova em tabela existente nunca aparecia, e os testes quebravam
    com "coluna não existe" até alguém recriar o banco à mão) e não executa os seeds — perfis,
    permissões e cargos vêm de migrations, não dos models.

    Rodando `alembic upgrade head`, o banco de testes fica idêntico ao de produção e a suíte
    ainda passa a exercitar as próprias migrations.
    """
    raiz = Path(__file__).parent
    # Config sem o alembic.ini de propósito: `alembic/env.py` só chama `fileConfig()` quando
    # há arquivo de configuração, e `fileConfig` desativa os loggers já existentes. Isso
    # silenciaria os loggers da aplicação pelo resto da sessão de testes — e os testes que
    # verificam mensagens de log passariam a falhar sem relação aparente com a causa.
    # Daqui só precisamos de `script_location`; a URL vem de env.py, via settings, já
    # apontando para o banco de testes.
    config = Config()
    config.set_main_option("script_location", str(raiz / "alembic"))
    command.upgrade(config, "head")
    yield
