import codecs
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
    pessoa = Pessoa(nome_completo="Admin Relatorios Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="relatorios.admin@example.com",
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


@pytest.fixture
def token_voluntario():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Voluntario Relatorios Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="relatorios.voluntario@example.com",
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == "Voluntário").first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()

    token = create_access_token(subject=str(usuario.id))

    yield token

    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


@pytest.mark.parametrize("formato,content_type_esperado", [
    ("csv", "text/csv"),
    ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ("pdf", "application/pdf"),
])
def test_relatorio_financeiro_nos_tres_formatos(token_admin, formato, content_type_esperado):
    response = client.get(
        "/relatorios/financeiro",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"formato": formato},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(content_type_esperado)
    assert len(response.content) > 0
    assert "attachment" in response.headers["content-disposition"]


def test_relatorio_pessoas_csv(token_admin):
    response = client.get(
        "/relatorios/pessoas",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"formato": "csv"},
    )
    assert response.status_code == 200
    assert b"nome_completo" in response.content


def test_relatorio_pessoas_deixa_de_fora_as_contas_tecnicas(token_admin):
    """RQ-03: conta técnica opera o sistema, não é gente da associação."""
    db = SessionLocal()
    agora = datetime.utcnow()
    tecnica = Pessoa(
        nome_completo="Conta Tecnica Relatorio", conta_tecnica=True,
        created_at=agora, updated_at=agora,
    )
    real = Pessoa(nome_completo="Pessoa Real Relatorio", created_at=agora, updated_at=agora)
    db.add_all([tecnica, real])
    db.commit()
    try:
        response = client.get(
            "/relatorios/pessoas",
            headers={"Authorization": f"Bearer {token_admin}"},
            params={"formato": "csv"},
        )
        assert response.status_code == 200
        assert "Pessoa Real Relatorio".encode() in response.content
        assert "Conta Tecnica Relatorio".encode() not in response.content
    finally:
        db.delete(tecnica)
        db.delete(real)
        db.commit()
        db.close()


def test_relatorio_csv_usa_ponto_e_virgula_e_bom(token_admin):
    """O Excel em portugues so divide as colunas com ';' e so reconhece o UTF-8 com BOM.

    Com virgula, a planilha abria com todas as colunas espremidas numa so -- reportado no
    teste visual como "arquivo baguncado".
    """
    response = client.get(
        "/relatorios/pessoas",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"formato": "csv"},
    )
    assert response.status_code == 200
    assert response.content.startswith(codecs.BOM_UTF8)

    cabecalho = response.content.decode("utf-8-sig").splitlines()[0]
    assert ";" in cabecalho
    assert "," not in cabecalho


def test_relatorio_projetos_xlsx(token_admin):
    response = client.get(
        "/relatorios/projetos",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"formato": "xlsx"},
    )
    assert response.status_code == 200


def test_relatorio_eventos_pdf(token_admin):
    response = client.get(
        "/relatorios/eventos",
        headers={"Authorization": f"Bearer {token_admin}"},
        params={"formato": "pdf"},
    )
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")


def test_voluntario_nao_acessa_relatorio_financeiro(token_voluntario):
    response = client.get(
        "/relatorios/financeiro", headers={"Authorization": f"Bearer {token_voluntario}"}
    )
    assert response.status_code == 403


def test_voluntario_acessa_relatorio_eventos(token_voluntario):
    response = client.get(
        "/relatorios/eventos", headers={"Authorization": f"Bearer {token_voluntario}"}
    )
    assert response.status_code == 200
