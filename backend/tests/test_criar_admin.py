"""Bootstrap do primeiro administrador (scripts/criar_admin.py).

Sem este script um banco recém-migrado fica inacessível: há perfis e permissões, mas
nenhum usuário, e todas as rotas que criariam um exigem estar autenticado.

A suíte roda contra acpb_db_test, que já tem perfis semeados pelas migrations mas pode
ter usuários deixados por outros testes — por isso cada caso limpa o que cria.
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest

from app.core.security import verify_password
from app.db.session import SessionLocal
from app.models.perfil import Perfil
from app.models.pessoa import Pessoa
from app.models.usuario import Usuario
from app.models.usuario_perfil import UsuarioPerfil

BACKEND_DIR = Path(__file__).resolve().parent.parent
EMAIL = "admin.bootstrap.teste@example.com"
EMAIL_SECUNDARIO = "outro.admin@example.com"
# Todos os e-mails que algum caso desta suite pode criar. A limpeza precisa cobrir todos:
# um deles sobrando faz os casos seguintes falharem por "e-mail ja cadastrado", sintoma que
# nao aponta para a causa.
EMAILS_DE_TESTE = (EMAIL, EMAIL_SECUNDARIO)
SENHA = "senhaForteDeTeste123"


def _rodar(**variaveis) -> subprocess.CompletedProcess:
    import os

    ambiente = {**os.environ, "ENVIRONMENT": "test", **variaveis}
    return subprocess.run(
        [sys.executable, "-m", "scripts.criar_admin"],
        cwd=BACKEND_DIR,
        env=ambiente,
        capture_output=True,
        text=True,
    )


def _perfil_admin(db):
    return db.query(Perfil).filter(Perfil.nome == "Administrador").first()


@pytest.fixture
def limpar_admin():
    """Remove o usuário criado pelo teste, e garante que não haja admin ativo antes.

    Admins ativos pré-existentes são apenas desativados e restaurados no final: apagá-los
    destruiria dados de outro teste ou do ambiente."""
    db = SessionLocal()

    def _remover_usuario_de_teste() -> None:
        for email in EMAILS_DE_TESTE:
            usuario = db.query(Usuario).filter(Usuario.email == email).first()
            if usuario:
                db.query(UsuarioPerfil).filter(UsuarioPerfil.usuario_id == usuario.id).delete()
                pessoa_id = usuario.pessoa_id
                db.query(Usuario).filter(Usuario.id == usuario.id).delete()
                db.query(Pessoa).filter(Pessoa.id == pessoa_id).delete()
        db.commit()

    # Limpa tambem na entrada, nao so na saida: se um teste anterior morrer antes do
    # teardown, a sobra deixaria todos os seguintes falhando com "e-mail ja cadastrado" —
    # um sintoma que nao aponta para a causa real.
    _remover_usuario_de_teste()

    perfil = _perfil_admin(db)
    preexistentes = (
        db.query(Usuario)
        .join(UsuarioPerfil, UsuarioPerfil.usuario_id == Usuario.id)
        .filter(UsuarioPerfil.perfil_id == perfil.id, Usuario.ativo.is_(True))
        .all()
    )
    for u in preexistentes:
        u.ativo = False
    db.commit()

    yield

    _remover_usuario_de_teste()
    for u in preexistentes:
        u.ativo = True
    db.commit()
    db.close()


def test_cria_administrador_com_perfil_vinculado(limpar_admin):
    resultado = _rodar(ADMIN_EMAIL=EMAIL, ADMIN_SENHA=SENHA, ADMIN_NOME="Admin Bootstrap")
    assert resultado.returncode == 0, resultado.stderr

    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == EMAIL).first()
    assert usuario is not None
    assert usuario.ativo is True
    assert verify_password(SENHA, usuario.senha_hash)
    assert usuario.pessoa.nome_completo == "Admin Bootstrap"

    vinculo = (
        db.query(UsuarioPerfil)
        .filter(
            UsuarioPerfil.usuario_id == usuario.id,
            UsuarioPerfil.perfil_id == _perfil_admin(db).id,
        )
        .first()
    )
    assert vinculo is not None, "usuário criado sem o perfil Administrador"
    db.close()


def test_nao_ecoa_a_senha_na_saida(limpar_admin):
    resultado = _rodar(ADMIN_EMAIL=EMAIL, ADMIN_SENHA=SENHA, ADMIN_NOME="Admin Bootstrap")
    assert SENHA not in resultado.stdout
    assert SENHA not in resultado.stderr


def test_recusa_quando_ja_existe_administrador_ativo(limpar_admin):
    """Rodar de novo não pode virar caminho para escalar privilégio nem trocar senha
    de um admin existente."""
    primeiro = _rodar(ADMIN_EMAIL=EMAIL, ADMIN_SENHA=SENHA, ADMIN_NOME="Admin Bootstrap")
    assert primeiro.returncode == 0, primeiro.stderr

    segundo = _rodar(
        ADMIN_EMAIL=EMAIL_SECUNDARIO,
        ADMIN_SENHA=SENHA,
        ADMIN_NOME="Outro Admin",
    )
    assert segundo.returncode == 1
    assert "já existe administrador ativo" in segundo.stderr

    db = SessionLocal()
    assert db.query(Usuario).filter(Usuario.email == EMAIL_SECUNDARIO).first() is None
    db.close()


@pytest.mark.parametrize(
    "variaveis",
    [
        {"ADMIN_SENHA": SENHA, "ADMIN_NOME": "X"},
        {"ADMIN_EMAIL": EMAIL, "ADMIN_NOME": "X"},
        {"ADMIN_EMAIL": EMAIL, "ADMIN_SENHA": SENHA},
        {"ADMIN_EMAIL": "", "ADMIN_SENHA": SENHA, "ADMIN_NOME": "X"},
    ],
)
def test_exige_as_tres_variaveis(limpar_admin, variaveis):
    completo = {"ADMIN_EMAIL": "", "ADMIN_SENHA": "", "ADMIN_NOME": "", **variaveis}
    resultado = _rodar(**completo)
    assert resultado.returncode == 1
    assert "ADMIN_EMAIL" in resultado.stderr


def test_recusa_senha_curta(limpar_admin):
    resultado = _rodar(ADMIN_EMAIL=EMAIL, ADMIN_SENHA="abcd", ADMIN_NOME="X")
    assert resultado.returncode == 1
    assert "ao menos 5" in resultado.stderr


def test_recusa_email_ja_cadastrado(limpar_admin):
    db = SessionLocal()
    agora = datetime.utcnow()
    pessoa = Pessoa(nome_completo="Ja Existe", created_at=agora, updated_at=agora)
    db.add(pessoa)
    db.flush()
    db.add(
        Usuario(
            pessoa_id=pessoa.id,
            email=EMAIL,
            senha_hash="x",
            ativo=False,
            created_at=agora,
            updated_at=agora,
        )
    )
    db.commit()
    db.close()

    resultado = _rodar(ADMIN_EMAIL=EMAIL, ADMIN_SENHA=SENHA, ADMIN_NOME="X")
    assert resultado.returncode == 1
    assert "já existe um usuário com o e-mail" in resultado.stderr
