from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import health, pessoas, cargos, membros, voluntarios, projetos, eventos, beneficiarios, inscricoes, dashboard, contas_financeiras, categorias_financeiras, movimentacoes_financeiras

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
app.include_router(pessoas.router, prefix="/pessoas", tags=["pessoas"])
app.include_router(cargos.router, prefix="/cargos", tags=["cargos"])
app.include_router(membros.router, prefix="/membros", tags=["membros"])
app.include_router(voluntarios.router, prefix="/voluntarios", tags=["voluntarios"])
app.include_router(projetos.router, prefix="/projetos", tags=["projetos"])
app.include_router(eventos.router, prefix="/eventos", tags=["eventos"])
app.include_router(beneficiarios.router, prefix="/beneficiarios", tags=["beneficiarios"])
app.include_router(inscricoes.router, prefix="/inscricoes", tags=["inscricoes"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(contas_financeiras.router, prefix="/contas-financeiras", tags=["contas financeiras"])
app.include_router(categorias_financeiras.router, prefix="/categorias-financeiras", tags=["categorias financeiras"])
app.include_router(movimentacoes_financeiras.router, prefix="/movimentacoes-financeiras", tags=["movimentacoes financeiras"])