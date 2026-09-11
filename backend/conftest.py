import os

# Precisa ser definido antes de qualquer import de app.core.config, para que
# Settings carregue .env.test em vez de .env (banco de desenvolvimento).
os.environ["ENVIRONMENT"] = "test"

import pytest

import app.models  # noqa: F401 - registra todos os models em Base.metadata
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

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
    """Garante que acpb_db_test tenha o schema atual antes da suíte rodar."""
    Base.metadata.create_all(bind=engine)
    yield
