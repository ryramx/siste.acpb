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

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Avoid passing empty password explicitly if not needed, but typical format is:
        return f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
