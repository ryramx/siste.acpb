from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Validacao Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="validacao.admin@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()

    token = create_access_token(subject=str(usuario.id))

    yield token

    db.query(Auditoria).filter(Auditoria.usuario_id == usuario.id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


ID_INEXISTENTE = 999_999_999


def test_criar_membro_com_pessoa_inexistente_retorna_404(token_admin):
    response = client.post(
        "/membros/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": ID_INEXISTENTE,
            "cargo_id": 1,
            "data_entrada": "2026-01-01",
            "ativo": True,
        },
    )
    assert response.status_code == 404


def test_criar_voluntario_com_pessoa_inexistente_retorna_404(token_admin):
    response = client.post(
        "/voluntarios/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={"pessoa_id": ID_INEXISTENTE, "data_inicio": "2026-01-01"},
    )
    assert response.status_code == 404


def test_criar_inscricao_com_evento_inexistente_retorna_404(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa para Inscricao Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    pessoa_id = pessoa.id
    db.close()

    response = client.post(
        "/inscricoes/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_id,
            "evento_id": ID_INEXISTENTE,
            "data_inscricao": "2026-01-01T10:00:00",
            "status": "CONFIRMADA",
        },
    )
    assert response.status_code == 404

    db = SessionLocal()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_criar_movimentacao_com_conta_inexistente_retorna_404(token_admin):
    db = SessionLocal()
    categoria_id = db.execute(
        __import__("sqlalchemy").text("SELECT id FROM categorias_financeiras LIMIT 1")
    ).scalar()
    pessoa_id = db.execute(__import__("sqlalchemy").text("SELECT id FROM pessoas LIMIT 1")).scalar()
    db.close()

    response = client.post(
        "/movimentacoes-financeiras/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "conta_financeira_id": ID_INEXISTENTE,
            "categoria_id": categoria_id,
            "responsavel_id": pessoa_id,
            "tipo": "ENTRADA",
            "descricao": "teste",
            "valor": "10.00",
            "data_movimentacao": "2026-01-01",
            "status": "CONFIRMADA",
        },
    )
    assert response.status_code == 404


def test_nenhuma_resposta_e_erro_500(token_admin):
    # Sanidade: nenhum dos casos acima (nem os já cobertos em outros arquivos) deve nunca
    # vazar um 500 por causa de uma FK inválida.
    response = client.post(
        "/eventos/",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "nome": "Evento com projeto inexistente",
            "data_evento": "2026-01-01",
            "exige_inscricao": False,
            "projeto_id": ID_INEXISTENTE,
        },
    )
    assert response.status_code == 404
