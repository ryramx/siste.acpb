"""Camada de armazenamento de arquivos (app/core/object_storage.py).

O provedor S3 não é exercitado aqui (exigiria rede/credenciais); o que se testa é o
contrato comum, a seleção de provedor por configuração e a validação de chave — que é
a defesa contra path traversal caso uma chave algum dia passe a vir de fora.
"""

import pytest

from app.core.object_storage import LocalStorage, S3Storage, criar_backend, remover_seguro


@pytest.fixture
def storage(tmp_path):
    return LocalStorage(str(tmp_path / "arquivos"))


CHAVE = "0123456789abcdef0123456789abcdef.pdf"


def test_salvar_e_ler_devolve_o_mesmo_conteudo(storage):
    storage.salvar(CHAVE, b"conteudo-do-comprovante", "application/pdf")
    assert storage.ler(CHAVE) == b"conteudo-do-comprovante"


def test_ler_chave_inexistente_devolve_none(storage):
    assert storage.ler(CHAVE) is None


def test_remover_apaga_o_arquivo(storage):
    storage.salvar(CHAVE, b"x", "application/pdf")
    storage.remover(CHAVE)
    assert storage.ler(CHAVE) is None


def test_remover_chave_inexistente_nao_levanta(storage):
    storage.remover(CHAVE)


def test_salvar_sobrescreve_mesma_chave(storage):
    storage.salvar(CHAVE, b"antigo", "application/pdf")
    storage.salvar(CHAVE, b"novo", "application/pdf")
    assert storage.ler(CHAVE) == b"novo"


@pytest.mark.parametrize(
    "chave_invalida",
    [
        "../../../etc/passwd",
        "0123456789abcdef0123456789abcdef.exe",
        "nao-e-um-uuid.pdf",
        "0123456789abcdef0123456789abcdef/../fuga.pdf",
        "",
    ],
)
def test_chave_invalida_e_recusada(storage, chave_invalida):
    with pytest.raises(ValueError, match="Chave de armazenamento inválida"):
        storage.ler(chave_invalida)


def test_criar_backend_usa_local_por_padrao(monkeypatch):
    monkeypatch.setattr("app.core.object_storage.settings.STORAGE_BACKEND", "local")
    assert isinstance(criar_backend("storage/x", "x"), LocalStorage)


def test_criar_backend_usa_s3_quando_configurado(monkeypatch):
    monkeypatch.setattr("app.core.object_storage.settings.STORAGE_BACKEND", "s3")
    assert isinstance(criar_backend("storage/x", "x"), S3Storage)


def test_remover_seguro_nao_propaga_falha(caplog):
    class BackendQuebrado:
        def remover(self, chave):
            raise OSError("disco indisponível")

    # Limpeza best-effort: uma falha aqui não pode derrubar a requisição nem mascarar
    # a exceção original de um commit que falhou.
    remover_seguro(BackendQuebrado(), CHAVE, "contexto de teste", "anexo")
    assert "Requer limpeza manual" in caplog.text
