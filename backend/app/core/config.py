import os

from pydantic_settings import BaseSettings, SettingsConfigDict

# Testes definem ENVIRONMENT=test (ver backend/conftest.py) antes de importar
# este módulo, para que a suíte carregue .env.test em vez de .env e nunca
# toque no banco de desenvolvimento.
_ENV_FILE = ".env.test" if os.getenv("ENVIRONMENT") == "test" else ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "ACPB Backend API"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "acpb_db"
    DATABASE_USER: str = "acpb_app"
    DATABASE_PASSWORD: str = ""
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Avoid passing empty password explicitly if not needed, but typical format is:
        return f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8")

settings = Settings()
