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


def test_producao_com_configuracao_valida_nao_lanca_erro():
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET_KEY="chave-forte",
        DATABASE_PASSWORD="senha",
        BACKEND_CORS_ORIGINS="https://acpb.example.com",
    )
    assert settings.ENVIRONMENT == "production"


def test_desenvolvimento_nao_exige_nada_disso():
    settings = Settings(ENVIRONMENT="development", JWT_SECRET_KEY="", DATABASE_PASSWORD="")
    assert settings.ENVIRONMENT == "development"
