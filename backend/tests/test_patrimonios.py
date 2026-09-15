from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.patrimonio import Patrimonio
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


def _criar_usuario(db, nome_perfil: str, email: str, nome_pessoa: str):
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo=nome_pessoa, created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email=email,
        senha_hash=hash_password("qualquerSenha123"),
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(usuario)
    db.flush()
    perfil = db.query(Perfil).filter(Perfil.nome == nome_perfil).first()
    db.add(UsuarioPerfil(usuario_id=usuario.id, perfil_id=perfil.id, created_at=agora))
    db.commit()
    return usuario, pessoa


def _limpar_usuario(db, usuario, pessoa):
    db.query(Auditoria).filter(Auditoria.usuario_id == usuario.id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()


@pytest.fixture
def token_admin():
    db = SessionLocal()
    usuario, pessoa = _criar_usuario(
        db, "Administrador", "patrimonio.admin@example.com", "Admin Patrimonio Teste"
    )
    token = create_access_token(subject=str(usuario.id))

    yield token, pessoa.id

    db.query(Patrimonio).filter(Patrimonio.codigo.like("TESTE-%")).delete(
        synchronize_session=False
    )
    db.commit()
    _limpar_usuario(db, usuario, pessoa)
    db.close()


@pytest.fixture
def token_voluntario():
    """Perfil sem nenhuma permissão de patrimônio — usado para travar a autorização."""
    db = SessionLocal()
    usuario, pessoa = _criar_usuario(
        db, "Voluntário", "patrimonio.voluntario@example.com", "Voluntario Patrimonio Teste"
    )
    token = create_access_token(subject=str(usuario.id))

    yield token

    _limpar_usuario(db, usuario, pessoa)
    db.close()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_criar_listar_e_atualizar_patrimonio(token_admin):
    token, pessoa_id = token_admin

    resposta = client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-001",
            "nome": "Notebook Dell",
            "categoria": "Informática",
            "data_aquisicao": "2026-01-15",
            "valor_aquisicao": "3500.00",
            "local": "Secretaria",
            "responsavel_id": pessoa_id,
            "status": "ATIVO",
        },
    )
    assert resposta.status_code == 201, resposta.text
    criado = resposta.json()
    assert criado["codigo"] == "TESTE-001"
    assert criado["status"] == "ATIVO"

    listagem = client.get("/patrimonios/", headers=_auth(token))
    assert listagem.status_code == 200
    assert any(p["codigo"] == "TESTE-001" for p in listagem.json())

    atualizacao = client.put(
        f"/patrimonios/{criado['id']}",
        headers=_auth(token),
        json={"status": "EM_MANUTENCAO", "local": "Assistência técnica"},
    )
    assert atualizacao.status_code == 200
    assert atualizacao.json()["status"] == "EM_MANUTENCAO"
    # Campos não enviados no PUT parcial devem permanecer intactos.
    assert atualizacao.json()["nome"] == "Notebook Dell"


def test_codigo_duplicado_e_rejeitado(token_admin):
    token, _ = token_admin
    base = {"codigo": "TESTE-DUP", "nome": "Cadeira", "categoria": "Mobiliário", "status": "ATIVO"}

    primeira = client.post("/patrimonios/", headers=_auth(token), json=base)
    assert primeira.status_code == 201

    segunda = client.post("/patrimonios/", headers=_auth(token), json=base)
    # O código identifica o bem fisicamente; duplicar significaria dois cadastros do mesmo bem.
    assert segunda.status_code == 409


def test_status_invalido_e_rejeitado(token_admin):
    token, _ = token_admin
    resposta = client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-STATUS",
            "nome": "Projetor",
            "categoria": "Equipamento",
            "status": "SUMIU",
        },
    )
    assert resposta.status_code == 422


def test_valor_negativo_e_rejeitado(token_admin):
    token, _ = token_admin
    resposta = client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-NEG",
            "nome": "Mesa",
            "categoria": "Mobiliário",
            "status": "ATIVO",
            "valor_aquisicao": "-10.00",
        },
    )
    assert resposta.status_code == 422


def test_responsavel_inexistente_retorna_404(token_admin):
    token, _ = token_admin
    resposta = client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-FK",
            "nome": "Impressora",
            "categoria": "Informática",
            "status": "ATIVO",
            "responsavel_id": 99999999,
        },
    )
    # Deve ser 404 explícito, nunca 500 por violação de FK.
    assert resposta.status_code == 404


def test_filtros_de_listagem(token_admin):
    token, _ = token_admin
    client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-FILTRO-A",
            "nome": "Violão",
            "categoria": "Instrumento",
            "status": "ATIVO",
        },
    )
    client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-FILTRO-B",
            "nome": "Teclado",
            "categoria": "Instrumento",
            "status": "BAIXADO",
        },
    )

    por_status = client.get("/patrimonios/?status_filtro=BAIXADO", headers=_auth(token))
    codigos = [p["codigo"] for p in por_status.json()]
    assert "TESTE-FILTRO-B" in codigos
    assert "TESTE-FILTRO-A" not in codigos

    por_categoria = client.get("/patrimonios/?categoria=Instrumento", headers=_auth(token))
    assert len([p for p in por_categoria.json() if p["codigo"].startswith("TESTE-FILTRO")]) == 2


def test_criacao_e_auditada(token_admin):
    token, _ = token_admin
    resposta = client.post(
        "/patrimonios/",
        headers=_auth(token),
        json={
            "codigo": "TESTE-AUDIT",
            "nome": "Caixa de som",
            "categoria": "Equipamento",
            "status": "ATIVO",
        },
    )
    assert resposta.status_code == 201

    db = SessionLocal()
    registro = (
        db.query(Auditoria)
        .filter(Auditoria.tabela == "patrimonios", Auditoria.registro_id == resposta.json()["id"])
        .first()
    )
    db.close()
    assert registro is not None
    assert registro.acao == "criar"


def test_perfil_sem_permissao_recebe_403(token_voluntario):
    resposta = client.get("/patrimonios/", headers=_auth(token_voluntario))
    assert resposta.status_code == 403


def test_sem_token_retorna_401():
    assert client.get("/patrimonios/").status_code == 401
