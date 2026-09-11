"""Regressão: GET /inscricoes/ deve filtrar por evento_id/pessoa_id quando informados.
Encontrado durante a integração do frontend (tarefa 30): o endpoint ignorava os query
params e sempre retornava todas as inscrições do sistema, quebrando a tela de inscrições
de um evento específico (mostrava inscritos de outros eventos)."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.evento import Evento
from app.models.inscricao import Inscricao
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Inscricoes Filtro Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="inscricoes.filtro.admin@example.com",
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

    yield token, pessoa.id

    db.query(Auditoria).filter(Auditoria.usuario_id == usuario.id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def test_listar_inscricoes_filtra_por_evento(token_admin):
    token, pessoa_id = token_admin
    headers = {"Authorization": f"Bearer {token}"}
    agora = datetime.utcnow()

    db = SessionLocal()
    evento_a = Evento(
        nome="Evento A Filtro",
        data_evento="2026-01-01",
        exige_inscricao=True,
        created_at=agora,
        updated_at=agora,
    )
    evento_b = Evento(
        nome="Evento B Filtro",
        data_evento="2026-01-02",
        exige_inscricao=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add_all([evento_a, evento_b])
    db.commit()
    db.refresh(evento_a)
    db.refresh(evento_b)

    try:
        insc_a = client.post(
            "/inscricoes/",
            headers=headers,
            json={
                "pessoa_id": pessoa_id,
                "evento_id": evento_a.id,
                "data_inscricao": "2026-01-01T10:00:00",
                "status": "CONFIRMADA",
            },
        ).json()

        response = client.get(
            "/inscricoes/", headers=headers, params={"evento_id": evento_a.id}
        )
        assert response.status_code == 200
        ids_retornados = {i["evento_id"] for i in response.json()}
        assert ids_retornados == {evento_a.id}

        response_b = client.get(
            "/inscricoes/", headers=headers, params={"evento_id": evento_b.id}
        )
        assert response_b.json() == []
    finally:
        db.query(Inscricao).filter(Inscricao.evento_id.in_([evento_a.id, evento_b.id])).delete(
            synchronize_session=False
        )
        db.query(Evento).filter(Evento.id.in_([evento_a.id, evento_b.id])).delete(
            synchronize_session=False
        )
        db.commit()
        db.close()
