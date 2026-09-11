from app.core.security import hash_password, verify_password
from app.schemas.usuario import UsuarioResponse


def test_hash_de_senha_gera_valor_diferente_do_texto_puro():
    senha = "minhaSenhaForte123"
    senha_hash = hash_password(senha)

    assert senha_hash != senha
    assert verify_password(senha, senha_hash) is True


def test_senha_incorreta_nao_verifica():
    senha_hash = hash_password("senhaCorreta123")

    assert verify_password("senhaErrada123", senha_hash) is False


def test_usuario_response_nunca_expoe_senha_hash():
    campos = UsuarioResponse.model_fields.keys()

    assert "senha_hash" not in campos
    assert "senha" not in campos
