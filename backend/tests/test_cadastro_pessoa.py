from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.beneficiario import Beneficiario
from app.models.cargo import Cargo
from app.models.membro import Membro
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.models.voluntario import Voluntario

client = TestClient(app)


@pytest.fixture
def token_admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Cadastro Teste", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="cadastro.admin@example.com",
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


def test_cadastra_pessoa_nova_e_vincula_como_voluntario(token_admin):
    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa": {"nome_completo": "Fulano de Tal Voluntario"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-01"},
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["papel_criado"] == "voluntario"
    assert body["voluntario"] is not None
    assert body["papeis"]["tem_voluntario"] is True
    assert body["papeis"]["tem_membro"] is False

    pessoa_id = body["pessoa"]["id"]
    db = SessionLocal()
    db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_reaproveita_pessoa_existente_para_novo_papel(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Pessoa com Múltiplos Papéis", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.commit()
    db.refresh(pessoa)
    pessoa_id = pessoa.id
    db.close()

    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_id,
            "papel": "beneficiario",
            "beneficiario": {"data_cadastro": "2026-01-01"},
        },
    )
    assert response.status_code == 201
    assert response.json()["pessoa"]["id"] == pessoa_id

    papeis = client.get(
        f"/cadastros/pessoa/{pessoa_id}/papeis",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    assert papeis.status_code == 200
    assert papeis.json()["tem_beneficiario"] is True

    db = SessionLocal()
    db.query(Beneficiario).filter(Beneficiario.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.commit()
    db.close()


def test_papel_duplicado_para_mesma_pessoa_e_rejeitado(token_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    cargo = Cargo(nome="Cargo Duplicado Teste", ativo=True, created_at=agora, updated_at=agora)
    db.add(cargo)
    db.flush()
    pessoa = Pessoa(nome_completo="Pessoa Membro Duplicado", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    cargo_id = cargo.id
    membro = Membro(
        pessoa_id=pessoa.id,
        cargo_id=cargo_id,
        data_entrada="2026-01-01",
        ativo=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add(membro)
    db.commit()
    pessoa_id = pessoa.id
    db.close()

    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": pessoa_id,
            "papel": "membro",
            "membro": {"cargo_id": cargo_id, "data_entrada": "2026-02-01", "ativo": True},
        },
    )
    assert response.status_code == 409

    db = SessionLocal()
    db.query(Membro).filter(Membro.pessoa_id == pessoa_id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
    db.query(Cargo).filter(Cargo.id == cargo_id).delete()
    db.commit()
    db.close()


def test_requer_ambos_pessoa_id_e_pessoa_como_erro(token_admin):
    response = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa_id": 1,
            "pessoa": {"nome_completo": "Não devia funcionar"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-01"},
        },
    )
    assert response.status_code == 422


def test_cadastra_pessoa_sem_cpf(token_admin):
    """CPF em branco é legítimo: nem sempre a associação tem o documento em mãos no
    momento do cadastro, e exigi-lo impediria registrar a pessoa."""
    resposta = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa": {"nome_completo": "Pessoa Sem Documento"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-10", "ativo": True},
        },
    )
    assert resposta.status_code == 201, resposta.text
    assert resposta.json()["pessoa"]["cpf"] is None

    db = SessionLocal()
    pessoa_id = resposta.json()["pessoa"]["id"]
    try:
        assert db.query(Pessoa).filter(Pessoa.id == pessoa_id).first().cpf is None
    finally:
        db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).delete()
        db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
        db.commit()
        db.close()


def test_varias_pessoas_sem_cpf_nao_colidem(token_admin):
    """`pessoas.cpf` tem índice único. No Postgres, NULL não conflita com NULL — mas se
    alguém trocar o nulo por string vazia, a segunda pessoa sem documento passaria a ser
    rejeitada por duplicidade. Este teste trava esse comportamento."""
    criados = []
    try:
        for nome in ("Sem Documento Um", "Sem Documento Dois"):
            resposta = client.post(
                "/cadastros/pessoa-vinculo",
                headers={"Authorization": f"Bearer {token_admin}"},
                json={
                    "pessoa": {"nome_completo": nome},
                    "papel": "voluntario",
                    "voluntario": {"data_inicio": "2026-01-10", "ativo": True},
                },
            )
            assert resposta.status_code == 201, resposta.text
            criados.append(resposta.json()["pessoa"]["id"])
    finally:
        db = SessionLocal()
        for pessoa_id in criados:
            db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).delete()
            db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
        db.commit()
        db.close()


def test_listagem_pode_omitir_contas_tecnicas(token_admin):
    """Contas que existem para operar o sistema saem das listas de escolher pessoa.

    Antes elas apareciam misturadas com as pessoas reais em toda selecao (inscrever num
    evento, vincular a projeto, responsavel por bem) e podiam ser envolvidas por engano numa
    atividade da associacao.
    """
    db = SessionLocal()
    agora = datetime.utcnow()
    real = Pessoa(nome_completo="Pessoa Real Teste", created_at=agora, updated_at=agora)
    tecnica = Pessoa(
        nome_completo="Conta Tecnica Teste",
        conta_tecnica=True,
        created_at=agora,
        updated_at=agora,
    )
    db.add_all([real, tecnica])
    db.commit()
    real_id, tecnica_id = real.id, tecnica.id
    db.close()

    headers = {"Authorization": f"Bearer {token_admin}"}
    try:
        # Sem o filtro, as duas aparecem: este mesmo endpoint resolve nomes e alimenta o
        # cadastro de usuarios, onde a conta tecnica precisa estar visivel.
        todas = client.get("/pessoas/", headers=headers)
        assert todas.status_code == 200
        ids_todas = {p["id"] for p in todas.json()}
        assert {real_id, tecnica_id} <= ids_todas

        filtradas = client.get("/pessoas/?excluir_tecnicas=true", headers=headers)
        assert filtradas.status_code == 200
        ids_filtradas = {p["id"] for p in filtradas.json()}
        assert real_id in ids_filtradas
        assert tecnica_id not in ids_filtradas
    finally:
        db = SessionLocal()
        db.query(Pessoa).filter(Pessoa.id.in_([real_id, tecnica_id])).delete(
            synchronize_session=False
        )
        db.commit()
        db.close()


def test_pessoa_nasce_sem_a_marca_tecnica(token_admin):
    """O padrao e ser gente da associacao; a marca e a excecao, definida a mao."""
    resposta = client.post(
        "/cadastros/pessoa-vinculo",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "pessoa": {"nome_completo": "Pessoa Padrao Teste"},
            "papel": "voluntario",
            "voluntario": {"data_inicio": "2026-01-01"},
        },
    )
    assert resposta.status_code == 201
    pessoa_id = resposta.json()["pessoa"]["id"]

    try:
        assert resposta.json()["pessoa"]["conta_tecnica"] is False
    finally:
        db = SessionLocal()
        from app.models.voluntario import Voluntario

        db.query(Voluntario).filter(Voluntario.pessoa_id == pessoa_id).delete()
        db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
        db.commit()
        db.close()
