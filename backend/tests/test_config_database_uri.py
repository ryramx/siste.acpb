"""SQLALCHEMY_DATABASE_URI deve escapar usuário/senha com caracteres especiais (@, :, /, espaço),
senão a string de conexão fica corrompida em vez de autenticar (ver LOTE 1 - hardening)."""

from app.core.config import Settings


def test_uri_escapa_senha_com_caracteres_especiais():
    settings = Settings(
        DATABASE_USER="acpb_app",
        DATABASE_PASSWORD="s3nh@:forte/com espaço",
        DATABASE_HOST="localhost",
        DATABASE_PORT="5432",
        DATABASE_NAME="acpb_db",
    )
    uri = settings.SQLALCHEMY_DATABASE_URI
    assert uri == (
        "postgresql+psycopg://acpb_app:s3nh%40%3Aforte%2Fcom+espa%C3%A7o"
        "@localhost:5432/acpb_db"
    )


def test_uri_escapa_usuario_com_caracteres_especiais():
    settings = Settings(
        DATABASE_USER="user@dominio",
        DATABASE_PASSWORD="senha",
        DATABASE_HOST="localhost",
        DATABASE_PORT="5432",
        DATABASE_NAME="acpb_db",
    )
    uri = settings.SQLALCHEMY_DATABASE_URI
    assert uri == "postgresql+psycopg://user%40dominio:senha@localhost:5432/acpb_db"


def test_uri_sem_caracteres_especiais_permanece_igual():
    settings = Settings(
        DATABASE_USER="acpb_app",
        DATABASE_PASSWORD="senha123",
        DATABASE_HOST="localhost",
        DATABASE_PORT="5432",
        DATABASE_NAME="acpb_db",
    )
    uri = settings.SQLALCHEMY_DATABASE_URI
    assert uri == "postgresql+psycopg://acpb_app:senha123@localhost:5432/acpb_db"
