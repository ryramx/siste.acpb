from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API do Sistema de Gestão da Associação Cristã Pau-Brasil",
    version="0.1.0"
)

# Configuração de CORS
if settings.BACKEND_CORS_ORIGINS:
    origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def root():
    return {"message": "API ACPB funcionando"}

app.include_router(health.router, prefix="/health", tags=["health"])
