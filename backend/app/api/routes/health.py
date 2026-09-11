from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db

router = APIRouter()

@router.get("/")
def health_check():
    """Verifica se a API está funcionando."""
    return {"status": "ok", "message": "API ACPB funcionando"}

@router.get("/db")
def health_check_db(db: Session = Depends(get_db)):
    """Verifica se a conexão com o banco de dados está funcionando."""
    try:
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {"status": "ok", "message": "Conexão com PostgreSQL bem sucedida"}
    except Exception as e:
        # Registrar o erro real apenas nos logs da aplicação e retornar mensagem genérica
        print(f"Erro ao conectar ao banco de dados: {e}")
        raise HTTPException(status_code=500, detail="Erro de conexão com o banco de dados")
