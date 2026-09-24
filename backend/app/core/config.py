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

    # Limite de tentativas nas rotas públicas de autenticação (ver app/core/rate_limit.py).
    #
    # Os valores são folgados para o uso real da associação — são poucas dezenas de usuários,
    # e ninguém erra a senha cinco vezes em quinze minutos por acidente — e apertados o
    # bastante para que força bruta deixe de ser viável.
    LOGIN_MAX_FALHAS_POR_EMAIL: int = 5
    LOGIN_MAX_FALHAS_POR_IP: int = 20
    LOGIN_JANELA_MINUTOS: int = 15
    # A recuperação de senha conta *todas* as chamadas, não só as falhas: de fora ela sempre
    # "dá certo" (resposta idêntica exista ou não o e-mail), e o custo a conter é o e-mail
    # enviado, que acontece justamente quando a chamada é bem-sucedida.
    RECUPERACAO_MAX_POR_EMAIL: int = 3
    RECUPERACAO_MAX_POR_IP: int = 10
    RECUPERACAO_JANELA_MINUTOS: int = 60

    # Observabilidade (ver app/core/monitoramento.py).
    #
    # SENTRY_DSN vazio desliga o relato externo: os erros continuam no log do servidor. É o
    # estado em desenvolvimento e nos testes, e também em produção enquanto a associação não
    # criar a conta — não é motivo para a aplicação recusar subir, porque um sistema sem
    # monitoramento atende, e um que não sobe não atende ninguém.
    SENTRY_DSN: str = ""
    # Amostragem de performance. Zero de propósito: o plano gratuito do Sentry tem cota, e o
    # que falta aqui é enxergar erro, não medir latência.
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0
    LOG_LEVEL: str = "INFO"

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

    # Envio de e-mail (recuperação de senha). Sem nenhum backend configurado, o token é
    # apenas logado — aceitável em desenvolvimento, proibido em produção (ver validação
    # abaixo).
    #
    # 'brevo' envia por HTTPS; 'smtp' fala direto com um servidor de e-mail. A escolha existe
    # porque o Render bloqueia as portas de SMTP (25, 465 e 587) nos serviços do plano
    # gratuito desde setembro de 2025, para conter spam: lá, qualquer SMTP falha por timeout
    # por mais correta que esteja a configuração. Uma API sobre HTTPS passa pelo bloqueio.
    # O SMTP continua sendo o caminho natural em desenvolvimento e em servidor próprio.
    EMAIL_BACKEND: str = "smtp"

    BREVO_API_KEY: str = ""

    # Remetente comum aos dois backends. Vazio herda de SMTP_FROM/SMTP_FROM_NOME, para que
    # as instalações que já usavam SMTP sigam funcionando sem mexer nas variáveis.
    EMAIL_FROM: str = ""
    EMAIL_FROM_NOME: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NOME: str = "Sistema ACPB"

    @property
    def remetente(self) -> str:
        return self.EMAIL_FROM or self.SMTP_FROM

    @property
    def remetente_nome(self) -> str:
        return self.EMAIL_FROM_NOME or self.SMTP_FROM_NOME

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

        # Sem e-mail, a recuperação de senha só registraria o token em log — em produção isso
        # é um vazamento de credencial: quem lê o log assume a conta de qualquer usuário.
        #
        # A exigência é que o backend escolhido esteja inteiro. Meio configurado é o pior dos
        # casos: a aplicação sobe, a tela diz "instruções enviadas" e nada é enviado.
        if self.EMAIL_BACKEND == "brevo":
            faltando = [
                nome
                for nome, valor in (
                    ("BREVO_API_KEY", self.BREVO_API_KEY),
                    ("EMAIL_FROM (ou SMTP_FROM)", self.remetente),
                )
                if not valor
            ]
            if faltando:
                erros.append("EMAIL_BACKEND=brevo exige: " + ", ".join(faltando))
        elif self.EMAIL_BACKEND == "smtp":
            if not self.SMTP_HOST:
                erros.append(
                    "SMTP_HOST é obrigatório (sem e-mail, a recuperação de senha expõe o "
                    "token em log)"
                )
            else:
                for nome in ("SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD"):
                    if not getattr(self, nome):
                        erros.append(f"{nome} é obrigatório quando SMTP_HOST está configurado")
        else:
            erros.append(
                f"EMAIL_BACKEND inválido: {self.EMAIL_BACKEND!r} (use 'smtp' ou 'brevo')"
            )

        if erros:
            raise ValueError(
                "Configuração inválida para ENVIRONMENT=production: " + "; ".join(erros)
            )
        return self

settings = Settings()
