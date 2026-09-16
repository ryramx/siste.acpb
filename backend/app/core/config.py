import os

from pydantic import model_validator
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
    # Alternativa aos campos acima: URL de conexão completa, como entregue por provedores
    # gerenciados (Neon, Render). Tem precedência quando definida.
    DATABASE_URL: str = ""
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173"

    # Ambiente
    ENVIRONMENT: str = "development"

    # Autenticação (ver backend/AUTENTICACAO.md)
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    RESET_PASSWORD_TOKEN_EXPIRE_MINUTES: int = 30

    # Anexos financeiros (tarefa 20).
    ANEXOS_STORAGE_DIR: str = "storage/anexos_financeiros"
    ANEXOS_TAMANHO_MAXIMO_MB: int = 5

    # Foto de perfil de Pessoa.
    FOTOS_STORAGE_DIR: str = "storage/fotos_pessoas"
    FOTOS_TAMANHO_MAXIMO_MB: int = 2

    # Armazenamento de arquivos: "local" (disco) ou "s3" (object storage S3-compatível).
    # Em produção o disco é efêmero na maioria das plataformas de PaaS — ver
    # app/core/object_storage.py e a seção "Armazenamento" em DEPLOY.md.
    STORAGE_BACKEND: str = "local"
    S3_ENDPOINT_URL: str = ""
    S3_BUCKET: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_REGION: str = "auto"

    # Envio de e-mail (recuperação de senha). Sem SMTP configurado, o token é apenas
    # logado — aceitável em desenvolvimento, proibido em produção (ver validação abaixo).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NOME: str = "Sistema ACPB"

    # URL pública do frontend, usada para montar o link de redefinição de senha no e-mail.
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        # Provedores gerenciados (Neon, Render, Supabase) entregam a conexão como uma URL
        # única, já com os parâmetros que eles exigem — notadamente `sslmode=require`, que
        # se perderia ao remontar a URI a partir de host/porta/usuário. Quando DATABASE_URL
        # está definida ela tem precedência; sem ela, monta-se a URI pelos campos avulsos
        # (caminho usado em desenvolvimento e nos testes).
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Essas URLs vêm no esquema genérico `postgresql://` (ou o legado `postgres://`),
            # mas este projeto usa o driver psycopg 3, que exige o esquema explícito.
            for prefixo in ("postgresql://", "postgres://"):
                if url.startswith(prefixo):
                    return "postgresql+psycopg://" + url[len(prefixo) :]
            return url
        return f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8")

    @model_validator(mode="after")
    def _validar_configuracao_producao(self) -> "Settings":
        # Falha cedo (na subida da aplicação) em vez de deixar uma configuração insegura ou
        # incompleta chegar a produção silenciosamente — ver backend/CORS_E_PRODUCAO.md.
        if self.ENVIRONMENT != "production":
            return self

        erros: list[str] = []
        if not self.JWT_SECRET_KEY:
            erros.append("JWT_SECRET_KEY é obrigatório")
        if not self.DATABASE_PASSWORD and not self.DATABASE_URL:
            erros.append("DATABASE_PASSWORD ou DATABASE_URL é obrigatório")
        origens = [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
        if not origens:
            erros.append("BACKEND_CORS_ORIGINS não pode ficar vazio")
        if "*" in origens:
            erros.append("BACKEND_CORS_ORIGINS não pode conter '*' (origem ampla)")

        # O disco das plataformas de PaaS em plano gratuito é efêmero: subir em produção
        # com STORAGE_BACKEND=local significa perder comprovantes financeiros no próximo
        # redeploy, silenciosamente. Falhar na subida é melhor que descobrir depois.
        if self.STORAGE_BACKEND == "local":
            erros.append(
                "STORAGE_BACKEND=local não é seguro em produção (disco efêmero): use 's3'"
            )
        elif self.STORAGE_BACKEND == "s3":
            faltando = [
                nome
                for nome, valor in (
                    ("S3_ENDPOINT_URL", self.S3_ENDPOINT_URL),
                    ("S3_BUCKET", self.S3_BUCKET),
                    ("S3_ACCESS_KEY_ID", self.S3_ACCESS_KEY_ID),
                    ("S3_SECRET_ACCESS_KEY", self.S3_SECRET_ACCESS_KEY),
                )
                if not valor
            ]
            if faltando:
                erros.append(
                    "STORAGE_BACKEND=s3 exige: " + ", ".join(faltando)
                )
            # O Supabase assina a requisição com a região real do projeto; o padrão "auto"
            # (que serve ao R2) produziria erro de assinatura só no primeiro upload, muito
            # depois do deploy. Falhar na subida aponta a causa em vez do sintoma.
            if "supabase" in self.S3_ENDPOINT_URL and self.S3_REGION == "auto":
                erros.append(
                    "S3_REGION deve ser a região real do projeto Supabase (ex.: 'us-east-2'), "
                    "não 'auto'"
                )
        else:
            erros.append(
                f"STORAGE_BACKEND inválido: {self.STORAGE_BACKEND!r} (use 'local' ou 's3')"
            )

        # Sem SMTP, a recuperação de senha só registraria o token em log — em produção isso
        # é um vazamento de credencial: quem lê o log assume a conta de qualquer usuário.
        if not self.SMTP_HOST:
            erros.append(
                "SMTP_HOST é obrigatório (sem e-mail, a recuperação de senha expõe o token em log)"
            )
        elif not self.SMTP_FROM:
            erros.append("SMTP_FROM é obrigatório quando SMTP_HOST está configurado")

        if erros:
            raise ValueError(
                "Configuração inválida para ENVIRONMENT=production: " + "; ".join(erros)
            )
        return self

settings = Settings()
