from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.auditoria import Auditoria
from app.models.beneficiario import Beneficiario
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.projeto import Projeto
from app.models.projeto_beneficiario import ProjetoBeneficiario
from app.models.projeto_voluntario import ProjetoVoluntario
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil
from app.models.voluntario import Voluntario

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
def cenario():
    """Projeto, um voluntário e um beneficiário — o mínimo para exercitar os vínculos."""
    db = SessionLocal()
    usuario, pessoa_admin = _criar_usuario(
        db, "Administrador", "vinculos.admin@example.com", "Admin Vinculos Teste"
    )
    token = create_access_token(subject=str(usuario.id))

    agora = datetime.utcnow()
    projeto = Projeto(
        nome="Projeto Vinculos Teste", status="ATIVO", created_at=agora, updated_at=agora
    )
    pessoa_vol = Pessoa(
        nome_completo="Voluntario Vinculos Teste", created_at=agora, updated_at=agora
    )
    pessoa_ben = Pessoa(
        nome_completo="Beneficiario Vinculos Teste", created_at=agora, updated_at=agora
    )
    db.add_all([projeto, pessoa_vol, pessoa_ben])
    db.flush()

    voluntario = Voluntario(
        pessoa_id=pessoa_vol.id,
        data_inicio=date(2026, 1, 1),
        area="Educação",
        created_at=agora,
        updated_at=agora,
    )
    beneficiario = Beneficiario(
        pessoa_id=pessoa_ben.id,
        data_cadastro=date(2026, 1, 1),
        created_at=agora,
        updated_at=agora,
    )
    db.add_all([voluntario, beneficiario])
    db.commit()

    dados = {
        "token": token,
        "projeto_id": projeto.id,
        "voluntario_id": voluntario.id,
        "beneficiario_id": beneficiario.id,
        "pessoa_admin_id": pessoa_admin.id,
    }

    yield dados

    db.query(ProjetoVoluntario).filter(
        ProjetoVoluntario.projeto_id == projeto.id
    ).delete(synchronize_session=False)
    db.query(ProjetoBeneficiario).filter(
        ProjetoBeneficiario.projeto_id == projeto.id
    ).delete(synchronize_session=False)
    db.query(Voluntario).filter(Voluntario.id == voluntario.id).delete()
    db.query(Beneficiario).filter(Beneficiario.id == beneficiario.id).delete()
    db.query(Projeto).filter(Projeto.id == projeto.id).delete()
    db.query(Pessoa).filter(Pessoa.id.in_([pessoa_vol.id, pessoa_ben.id])).delete(
        synchronize_session=False
    )
    db.commit()
    _limpar_usuario(db, usuario, pessoa_admin)
    db.close()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_vincular_listar_e_desvincular_voluntario(cenario):
    token, projeto_id = cenario["token"], cenario["projeto_id"]

    criacao = client.post(
        f"/projetos/{projeto_id}/voluntarios",
        headers=_auth(token),
        json={
            "voluntario_id": cenario["voluntario_id"],
            "funcao": "Instrutor",
            "data_entrada": "2026-02-01",
        },
    )
    assert criacao.status_code == 201, criacao.text
    vinculo = criacao.json()
    assert vinculo["funcao"] == "Instrutor"
    # O nome vem resolvido pela rota: a tela não precisa buscar pessoa por pessoa.
    assert vinculo["pessoa_nome"] == "Voluntario Vinculos Teste"
    assert vinculo["area"] == "Educação"

    listagem = client.get(f"/projetos/{projeto_id}/voluntarios", headers=_auth(token))
    assert listagem.status_code == 200
    assert [v["pessoa_nome"] for v in listagem.json()] == ["Voluntario Vinculos Teste"]

    remocao = client.delete(
        f"/projetos/{projeto_id}/voluntarios/{vinculo['id']}", headers=_auth(token)
    )
    assert remocao.status_code == 204

    assert client.get(
        f"/projetos/{projeto_id}/voluntarios", headers=_auth(token)
    ).json() == []


def test_vincular_listar_e_desvincular_beneficiario(cenario):
    token, projeto_id = cenario["token"], cenario["projeto_id"]

    criacao = client.post(
        f"/projetos/{projeto_id}/beneficiarios",
        headers=_auth(token),
        json={"beneficiario_id": cenario["beneficiario_id"], "papel": "Aluno"},
    )
    assert criacao.status_code == 201, criacao.text
    vinculo = criacao.json()
    assert vinculo["papel"] == "Aluno"
    assert vinculo["pessoa_nome"] == "Beneficiario Vinculos Teste"

    listagem = client.get(f"/projetos/{projeto_id}/beneficiarios", headers=_auth(token))
    assert listagem.status_code == 200
    assert len(listagem.json()) == 1

    remocao = client.delete(
        f"/projetos/{projeto_id}/beneficiarios/{vinculo['id']}", headers=_auth(token)
    )
    assert remocao.status_code == 204


def test_vinculo_duplicado_e_rejeitado(cenario):
    token, projeto_id = cenario["token"], cenario["projeto_id"]
    corpo = {"voluntario_id": cenario["voluntario_id"]}

    assert (
        client.post(
            f"/projetos/{projeto_id}/voluntarios", headers=_auth(token), json=corpo
        ).status_code
        == 201
    )

    # Vincular duas vezes criaria a mesma pessoa repetida na equipe do projeto.
    segunda = client.post(
        f"/projetos/{projeto_id}/voluntarios", headers=_auth(token), json=corpo
    )
    assert segunda.status_code == 409, segunda.text


def test_vincular_em_projeto_inexistente_retorna_404(cenario):
    resposta = client.post(
        "/projetos/99999999/voluntarios",
        headers=_auth(cenario["token"]),
        json={"voluntario_id": cenario["voluntario_id"]},
    )
    assert resposta.status_code == 404


def test_vincular_voluntario_inexistente_retorna_404(cenario):
    resposta = client.post(
        f"/projetos/{cenario['projeto_id']}/voluntarios",
        headers=_auth(cenario["token"]),
        json={"voluntario_id": 99999999},
    )
    assert resposta.status_code == 404


def test_desvincular_de_outro_projeto_retorna_404(cenario):
    """O vínculo precisa pertencer ao projeto da URL — senão um id solto apagaria
    o vínculo de qualquer outro projeto."""
    token, projeto_id = cenario["token"], cenario["projeto_id"]
    criado = client.post(
        f"/projetos/{projeto_id}/voluntarios",
        headers=_auth(token),
        json={"voluntario_id": cenario["voluntario_id"]},
    ).json()

    resposta = client.delete(
        f"/projetos/99999999/voluntarios/{criado['id']}", headers=_auth(token)
    )
    assert resposta.status_code == 404
