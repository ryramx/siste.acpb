"""Tarefa 37: a aplicação deve falhar cedo ao subir com ENVIRONMENT=production e configuração
insegura/incompleta, em vez de aceitar segredos vazios ou CORS amplo silenciosamente."""

import pytest

from app.core.config import Settings


def test_producao_exige_jwt_secret_key():
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="",
            DATABASE_PASSWORD="senha",
            BACKEND_CORS_ORIGINS="https://acpb.example.com",
        )


def test_producao_exige_database_password():
    with pytest.raises(ValueError, match="DATABASE_PASSWORD"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="chave-forte",
            DATABASE_PASSWORD="",
            BACKEND_CORS_ORIGINS="https://acpb.example.com",
        )


def test_producao_rejeita_cors_amplo():
    with pytest.raises(ValueError, match="origem ampla"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="chave-forte",
            DATABASE_PASSWORD="senha",
            BACKEND_CORS_ORIGINS="*",
        )


def test_producao_rejeita_cors_vazio():
    with pytest.raises(ValueError, match="BACKEND_CORS_ORIGINS"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="chave-forte",
            DATABASE_PASSWORD="senha",
            BACKEND_CORS_ORIGINS="",
        )


PRODUCAO_VALIDA = dict(
    ENVIRONMENT="production",
    JWT_SECRET_KEY="chave-forte",
    DATABASE_PASSWORD="senha",
    BACKEND_CORS_ORIGINS="https://acpb.example.com",
    STORAGE_BACKEND="s3",
    S3_ENDPOINT_URL="https://conta.r2.cloudflarestorage.com",
    S3_BUCKET="acpb-arquivos",
    S3_ACCESS_KEY_ID="chave",
    S3_SECRET_ACCESS_KEY="segredo",
    SMTP_HOST="smtp-relay.brevo.com",
    SMTP_FROM="sistema@acpb.example.com",
    SMTP_USER="sistema@acpb.example.com",
    SMTP_PASSWORD="senha-de-aplicativo",
)


def test_producao_com_configuracao_valida_nao_lanca_erro():
    settings = Settings(**PRODUCAO_VALIDA)
    assert settings.ENVIRONMENT == "production"


def test_producao_rejeita_storage_local():
    """Disco de PaaS gratuito é efêmero: subir com storage local perderia comprovantes
    financeiros no próximo redeploy, sem aviso."""
    with pytest.raises(ValueError, match="disco efêmero"):
        Settings(**{**PRODUCAO_VALIDA, "STORAGE_BACKEND": "local"})


def test_producao_exige_credenciais_de_s3_completas():
    with pytest.raises(ValueError, match="S3_BUCKET"):
        Settings(**{**PRODUCAO_VALIDA, "S3_BUCKET": ""})


def test_producao_rejeita_storage_backend_desconhecido():
    with pytest.raises(ValueError, match="STORAGE_BACKEND inválido"):
        Settings(**{**PRODUCAO_VALIDA, "STORAGE_BACKEND": "gdrive"})


def test_producao_exige_smtp():
    """Sem SMTP a recuperação de senha cairia no log do token — vazamento de credencial."""
    with pytest.raises(ValueError, match="SMTP_HOST"):
        Settings(**{**PRODUCAO_VALIDA, "SMTP_HOST": ""})


def test_producao_exige_remetente_quando_ha_smtp():
    with pytest.raises(ValueError, match="SMTP_FROM"):
        Settings(**{**PRODUCAO_VALIDA, "SMTP_FROM": ""})


def test_producao_exige_credenciais_smtp_completas():
    """Com HOST e FROM preenchidos e credenciais em branco, a aplicacao subia e o envio
    falhava em silencio: a tela dizia "instrucoes enviadas" e nenhum e-mail chegava."""
    with pytest.raises(ValueError, match="SMTP_USER"):
        Settings(**{**PRODUCAO_VALIDA, "SMTP_USER": ""})

    with pytest.raises(ValueError, match="SMTP_PASSWORD"):
        Settings(**{**PRODUCAO_VALIDA, "SMTP_PASSWORD": ""})


def test_desenvolvimento_nao_exige_nada_disso():
    settings = Settings(ENVIRONMENT="development", JWT_SECRET_KEY="", DATABASE_PASSWORD="")
    assert settings.ENVIRONMENT == "development"


def test_database_url_tem_precedencia_e_normaliza_o_driver():
    """Provedores gerenciados entregam `postgresql://...?sslmode=require`. Remontar a URI
    pelos campos avulsos perderia o sslmode; o esquema precisa virar o do psycopg 3."""
    settings = Settings(
        DATABASE_URL="postgresql://u:p@ep-abc.neon.tech/acpb?sslmode=require",
        DATABASE_NAME="ignorado",
    )
    assert settings.SQLALCHEMY_DATABASE_URI == (
        "postgresql+psycopg://u:p@ep-abc.neon.tech/acpb?sslmode=require"
    )


def test_database_url_aceita_esquema_legado_postgres():
    settings = Settings(DATABASE_URL="postgres://u:p@host/acpb")
    assert settings.SQLALCHEMY_DATABASE_URI.startswith("postgresql+psycopg://")


def test_sem_database_url_monta_uri_pelos_campos_avulsos():
    settings = Settings(
        DATABASE_URL="",
        DATABASE_USER="acpb_app",
        DATABASE_PASSWORD="senha",
        DATABASE_HOST="localhost",
        DATABASE_PORT="5432",
        DATABASE_NAME="acpb_db",
    )
    assert settings.SQLALCHEMY_DATABASE_URI == (
        "postgresql+psycopg://acpb_app:senha@localhost:5432/acpb_db"
    )


def test_producao_aceita_database_url_no_lugar_da_senha_avulsa():
    config = {**PRODUCAO_VALIDA, "DATABASE_PASSWORD": ""}
    config["DATABASE_URL"] = "postgresql://u:p@ep-abc.neon.tech/acpb?sslmode=require"
    assert Settings(**config).ENVIRONMENT == "production"


def test_producao_rejeita_regiao_auto_no_supabase():
    """'auto' serve ao R2, mas o Supabase assina com a regiao real do projeto — o erro
    apareceria so no primeiro upload, muito depois do deploy."""
    with pytest.raises(ValueError, match="S3_REGION"):
        Settings(
            **{
                **PRODUCAO_VALIDA,
                "S3_ENDPOINT_URL": "https://proj.supabase.co/storage/v1/s3",
                "S3_REGION": "auto",
            }
        )


def test_producao_aceita_supabase_com_regiao_explicita():
    config = {
        **PRODUCAO_VALIDA,
        "S3_ENDPOINT_URL": "https://proj.supabase.co/storage/v1/s3",
        "S3_REGION": "us-east-2",
    }
    assert Settings(**config).ENVIRONMENT == "production"


def test_regiao_auto_continua_valida_fora_do_supabase():
    """Nao quebrar quem usar R2 ou outro provedor que ignora a regiao."""
    config = {**PRODUCAO_VALIDA, "S3_ENDPOINT_URL": "https://x.r2.cloudflarestorage.com"}
    assert Settings(**config).S3_REGION == "auto"
