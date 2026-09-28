"""Categoria repetida do mesmo tipo (RQ-12 da rodada de QA de 25/09/2026).

O banco já recusava o nome idêntico, mas "aluguel" ao lado de "Aluguel" passava.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.categoria_financeira import CategoriaFinanceira
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)
PREFIXO = "Teste Categoria Duplicada"


@pytest.fixture
def headers():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Categorias Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id, email="categorias.admin@example.com",
        senha_hash=hash_password("qualquerSenha123"), ativo=True,
        created_at=agora, updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Administrador").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()

    yield {"Authorization": f"Bearer {create_access_token(subject=str(usuario.id))}"}

    db.query(CategoriaFinanceira).filter(CategoriaFinanceira.nome.ilike(f"{PREFIXO}%")).delete(
        synchronize_session=False
    )
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


def _criar(headers, nome, tipo="SAIDA"):
    return client.post(
        "/categorias-financeiras/", headers=headers, json={"nome": nome, "tipo": tipo, "ativo": True}
    )


def test_recusa_o_mesmo_nome_com_outra_caixa_ou_acento(headers):
    assert _criar(headers, f"{PREFIXO} Aluguel").status_code == 201

    for variacao in (f"{PREFIXO} aluguel", f"{PREFIXO.upper()} ALUGUÉL", f"  {PREFIXO}   Aluguel "):
        resposta = _criar(headers, variacao)
        assert resposta.status_code == 409, variacao
        assert "Já existe" in resposta.json()["detail"]


def test_mesmo_nome_em_outro_tipo_pode(headers):
    assert _criar(headers, f"{PREFIXO} Eventos", "SAIDA").status_code == 201
    assert _criar(headers, f"{PREFIXO} eventos", "ENTRADA").status_code == 201


def test_renomear_para_um_nome_que_ja_existe_e_recusado(headers):
    _criar(headers, f"{PREFIXO} Água")
    outra = _criar(headers, f"{PREFIXO} Luz").json()

    resposta = client.put(
        f"/categorias-financeiras/{outra['id']}", headers=headers, json={"nome": f"{PREFIXO} agua"}
    )
    assert resposta.status_code == 409

    # Mudar outra coisa da mesma categoria continua podendo.
    resposta = client.put(
        f"/categorias-financeiras/{outra['id']}", headers=headers, json={"nome": f"{PREFIXO} Luz"}
    )
    assert resposta.status_code == 200
