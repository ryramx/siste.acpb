"""Inscrição de participantes pela tela do evento: pessoa já cadastrada, visitante avulso,
limite de vagas e duplicidade."""

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
from app.models.telefone import Telefone
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

client = TestClient(app)


@pytest.fixture
def admin():
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Admin Inscricoes Evento", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    usuario = Usuario(
        pessoa_id=pessoa.id,
        email="inscricoes.evento.admin@example.com",
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

    yield {"headers": {"Authorization": f"Bearer {token}"}, "pessoa_id": pessoa.id}

    db.query(Auditoria).filter(Auditoria.usuario_id == usuario.id).delete()
    db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
    db.query(Usuario).filter(Usuario.id == usuario.id).delete()
    db.query(Pessoa).filter(Pessoa.id == pessoa.id).delete()
    db.commit()
    db.close()


@pytest.fixture
def evento_com_uma_vaga():
    db = SessionLocal()
    agora = datetime.utcnow()
    evento = Evento(
        nome="Jiu-jitsu Teste",
        data_evento="2026-09-23",
        exige_inscricao=True,
        limite_participantes=1,
        created_at=agora,
        updated_at=agora,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)

    yield evento.id

    pessoa_ids = [
        i.pessoa_id for i in db.query(Inscricao).filter(Inscricao.evento_id == evento.id).all()
    ]
    db.query(Inscricao).filter(Inscricao.evento_id == evento.id).delete(synchronize_session=False)
    if pessoa_ids:
        # Só as pessoas criadas pelo cadastro avulso destes testes (as demais têm vínculos).
        db.query(Telefone).filter(Telefone.pessoa_id.in_(pessoa_ids)).delete(
            synchronize_session=False
        )
        db.query(Pessoa).filter(
            Pessoa.id.in_(pessoa_ids), Pessoa.nome_completo.like("Visitante Teste%")
        ).delete(synchronize_session=False)
    db.query(Evento).filter(Evento.id == evento.id).delete()
    db.commit()
    db.close()


def test_inscrever_pessoa_cadastrada(admin, evento_com_uma_vaga):
    resposta = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes",
        headers=admin["headers"],
        json={"pessoa_id": admin["pessoa_id"]},
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert corpo["status"] == "CONFIRMADA"
    assert corpo["pessoa_nome"] == "Admin Inscricoes Evento"

    listagem = client.get(
        f"/eventos/{evento_com_uma_vaga}/inscricoes", headers=admin["headers"]
    )
    assert [i["id"] for i in listagem.json()] == [corpo["id"]]


def test_inscrever_a_mesma_pessoa_duas_vezes_retorna_409(admin, evento_com_uma_vaga):
    corpo = {"pessoa_id": admin["pessoa_id"]}
    client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes", headers=admin["headers"], json=corpo
    )
    repetida = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes", headers=admin["headers"], json=corpo
    )
    assert repetida.status_code == 409
    assert "já está inscrita" in repetida.json()["detail"]


def test_inscrever_visitante_avulso_cria_pessoa_e_telefone(admin, evento_com_uma_vaga):
    resposta = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes/avulsa",
        headers=admin["headers"],
        json={"nome_completo": "Visitante Teste Maria", "telefone": "(81) 99999-1234"},
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert corpo["pessoa_nome"] == "Visitante Teste Maria"
    assert corpo["pessoa_telefone"] == "81999991234"

    db = SessionLocal()
    try:
        pessoa = db.query(Pessoa).filter(Pessoa.id == corpo["pessoa_id"]).first()
        assert pessoa is not None
        assert pessoa.membro is None and pessoa.voluntario is None and pessoa.beneficiario is None
    finally:
        db.close()


def test_inscricao_alem_do_limite_de_vagas_retorna_409(admin, evento_com_uma_vaga):
    client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes",
        headers=admin["headers"],
        json={"pessoa_id": admin["pessoa_id"]},
    )
    excedente = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes/avulsa",
        headers=admin["headers"],
        json={"nome_completo": "Visitante Teste Excedente"},
    )
    assert excedente.status_code == 409
    assert "limite de 1 participantes" in excedente.json()["detail"]

    db = SessionLocal()
    try:
        # A pessoa não pode ter sido criada se a inscrição foi recusada.
        assert (
            db.query(Pessoa).filter(Pessoa.nome_completo == "Visitante Teste Excedente").first()
            is None
        )
    finally:
        db.close()


def test_cancelar_inscricao_libera_a_vaga(admin, evento_com_uma_vaga):
    inscricao = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes",
        headers=admin["headers"],
        json={"pessoa_id": admin["pessoa_id"]},
    ).json()

    cancelamento = client.put(
        f"/inscricoes/{inscricao['id']}",
        headers=admin["headers"],
        json={"status": "CANCELADA"},
    )
    assert cancelamento.status_code == 200

    outro = client.post(
        f"/eventos/{evento_com_uma_vaga}/inscricoes/avulsa",
        headers=admin["headers"],
        json={"nome_completo": "Visitante Teste Joao"},
    )
    assert outro.status_code == 201, outro.text
