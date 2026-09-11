from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "ACPB Backend API"
    
    # Database
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "acpb_db"
    DATABASE_USER: str = "acpb_app"
    DATABASE_PASSWORD: str = ""
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    # Ambiente
    ENVIRONMENT: str = "development"

    # Autenticação (ver backend/AUTENTICACAO.md)
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    RESET_PASSWORD_TOKEN_EXPIRE_MINUTES: int = 30

    # Anexos financeiros (tarefa 20). Provider inicial: sistema de arquivos local. Migrar para
    # object storage (S3-compatível) é um upgrade de infraestrutura, não muda a API pública.
    ANEXOS_STORAGE_DIR: str = "storage/anexos_financeiros"
    ANEXOS_TAMANHO_MAXIMO_MB: int = 5

    # Foto de perfil de Pessoa. Mesmo provider (sistema de arquivos local).
    FOTOS_STORAGE_DIR: str = "storage/fotos_pessoas"
    FOTOS_TAMANHO_MAXIMO_MB: int = 2

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Avoid passing empty password explicitly if not needed, but typical format is:
        return f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def _validar_configuracao_producao(self) -> "Settings":
        # Falha cedo (na subida da aplicação) em vez de deixar uma configuração insegura ou
        # incompleta chegar a produção silenciosamente — ver backend/CORS_E_PRODUCAO.md.
        if self.ENVIRONMENT != "production":
            return self

        erros: list[str] = []
        if not self.JWT_SECRET_KEY:
            erros.append("JWT_SECRET_KEY é obrigatório")
        if not self.DATABASE_PASSWORD:
            erros.append("DATABASE_PASSWORD é obrigatório")
        origens = [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
        if not origens:
            erros.append("BACKEND_CORS_ORIGINS não pode ficar vazio")
        if "*" in origens:
            erros.append("BACKEND_CORS_ORIGINS não pode conter '*' (origem ampla)")

        if erros:
            raise ValueError(
                "Configuração inválida para ENVIRONMENT=production: " + "; ".join(erros)
            )
        return self

settings = Settings()
