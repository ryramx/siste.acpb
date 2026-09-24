"""Relato de erro de tela vindo do navegador (`POST /monitoramento/erro-cliente`).

Sem esta rota, uma tela que quebra no celular de quem usa o sistema é invisível para quem o
mantém: nenhuma requisição falha, e o erro morre no console do navegador.
"""

import logging
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario

client = TestClient(app)

RELATO = {
    "mensagem": "Cannot read properties of undefined (reading 'nome')",
    "caminho": "/membros/12",
    "detalhe": "at MemberDetails\nat Suspense",
}


@pytest.fixture
def token():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Usuário Erro de Tela", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="erro.tela@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.commit()
    ids = (usuario.id, pessoa.id)
    db.close()

    yield create_access_token(subject=str(ids[0]))

    db = SessionLocal()
    db.query(Usuario).filter(Usuario.id == ids[0]).delete()
    db.query(Pessoa).filter(Pessoa.id == ids[1]).delete()
    db.commit()
    db.close()


def test_relato_vai_para_o_log_do_servidor(token, caplog):
    with caplog.at_level(logging.ERROR):
        resposta = client.post(
            "/monitoramento/erro-cliente",
            headers={"Authorization": f"Bearer {token}"},
            json=RELATO,
        )

    assert resposta.status_code == 204
    registro = next(r for r in caplog.records if "Erro de tela relatado" in r.getMessage())
    mensagem = registro.getMessage()
    assert "reading 'nome'" in mensagem
    assert "/membros/12" in mensagem
    assert "MemberDetails" in mensagem


def test_sem_token_e_recusado():
    """A rota escreve no log do servidor: aberta, serviria de canal para poluí-lo."""
    assert client.post("/monitoramento/erro-cliente", json=RELATO).status_code == 401


def test_texto_gigante_e_recusado(token):
    """O cliente não é confiável: o teto do schema é o que impede um relato de encher o log."""
    resposta = client.post(
        "/monitoramento/erro-cliente",
        headers={"Authorization": f"Bearer {token}"},
        json={**RELATO, "detalhe": "x" * 5000},
    )
    assert resposta.status_code == 422


def test_enxurrada_de_relatos_e_limitada(token):
    """Um componente que estoura a cada render chamaria isto sem parar. Do segundo relato
    idêntico em diante não há informação nova, então perder não custa nada."""
    headers = {"Authorization": f"Bearer {token}"}
    for _ in range(10):
        assert client.post(
            "/monitoramento/erro-cliente", headers=headers, json=RELATO
        ).status_code == 204

    assert client.post(
        "/monitoramento/erro-cliente", headers=headers, json=RELATO
    ).status_code == 429
