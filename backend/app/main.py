from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.deps import get_current_user
from app.api.routes import auth, health, pessoas, cargos, membros, voluntarios, projetos, eventos, beneficiarios, inscricoes, dashboard, contas_financeiras, categorias_financeiras, movimentacoes_financeiras, usuarios, perfis, permissoes, auditoria, telefones, cadastros, atendimentos, anexos_financeiros, relatorios

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

# Rotas públicas (sem autenticação), conforme política definida em backend/AUTENTICACAO.md
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(health.router, prefix="/health", tags=["health"])

# Todas as demais rotas exigem um usuário autenticado e ativo (tarefa 10).
# Autorização por perfil/permissão granular é aplicada dentro de cada rota (tarefa 11).
_protegido = [Depends(get_current_user)]

app.include_router(pessoas.router, prefix="/pessoas", tags=["pessoas"], dependencies=_protegido)
app.include_router(cargos.router, prefix="/cargos", tags=["cargos"], dependencies=_protegido)
app.include_router(membros.router, prefix="/membros", tags=["membros"], dependencies=_protegido)
app.include_router(voluntarios.router, prefix="/voluntarios", tags=["voluntarios"], dependencies=_protegido)
app.include_router(projetos.router, prefix="/projetos", tags=["projetos"], dependencies=_protegido)
app.include_router(eventos.router, prefix="/eventos", tags=["eventos"], dependencies=_protegido)
app.include_router(beneficiarios.router, prefix="/beneficiarios", tags=["beneficiarios"], dependencies=_protegido)
app.include_router(inscricoes.router, prefix="/inscricoes", tags=["inscricoes"], dependencies=_protegido)
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=_protegido)
app.include_router(contas_financeiras.router, prefix="/contas-financeiras", tags=["contas financeiras"], dependencies=_protegido)
app.include_router(categorias_financeiras.router, prefix="/categorias-financeiras", tags=["categorias financeiras"], dependencies=_protegido)
app.include_router(movimentacoes_financeiras.router, prefix="/movimentacoes-financeiras", tags=["movimentacoes financeiras"], dependencies=_protegido)
app.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"], dependencies=_protegido)
app.include_router(perfis.router, prefix="/perfis", tags=["perfis"], dependencies=_protegido)
app.include_router(permissoes.router, prefix="/permissoes", tags=["permissoes"], dependencies=_protegido)
app.include_router(auditoria.router, prefix="/auditoria", tags=["auditoria"], dependencies=_protegido)
app.include_router(telefones.router, prefix="/telefones", tags=["telefones"], dependencies=_protegido)
app.include_router(cadastros.router, prefix="/cadastros", tags=["cadastros"], dependencies=_protegido)
app.include_router(atendimentos.router, prefix="/atendimentos", tags=["atendimentos"], dependencies=_protegido)
app.include_router(anexos_financeiros.router, prefix="/anexos-financeiros", tags=["anexos financeiros"], dependencies=_protegido)
app.include_router(relatorios.router, prefix="/relatorios", tags=["relatorios"], dependencies=_protegido)
