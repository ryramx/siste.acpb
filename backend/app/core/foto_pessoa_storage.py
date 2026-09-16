import uuid

from app.core.config import settings
from app.core.object_storage import criar_backend, remover_seguro

TIPOS_PERMITIDOS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
}

TAMANHO_MAXIMO_BYTES = settings.FOTOS_TAMANHO_MAXIMO_MB * 1024 * 1024

_backend = criar_backend(settings.FOTOS_STORAGE_DIR, "fotos_pessoas")


def gerar_nome_armazenado(tipo_mime: str) -> str:
    extensao = TIPOS_PERMITIDOS[tipo_mime]
    return f"{uuid.uuid4().hex}{extensao}"


def tipo_mime_de(nome_armazenado: str) -> str:
    return "image/png" if nome_armazenado.endswith(".png") else "image/jpeg"


def salvar_conteudo(nome_armazenado: str, conteudo: bytes, tipo_mime: str) -> None:
    _backend.salvar(nome_armazenado, conteudo, tipo_mime)


def ler_conteudo(nome_armazenado: str) -> bytes | None:
    """Retorna os bytes da foto, ou None se o arquivo não existir no armazenamento."""
    return _backend.ler(nome_armazenado)


def remover_arquivo(nome_armazenado: str) -> None:
    _backend.remover(nome_armazenado)


def remover_arquivo_seguro(nome_armazenado: str, contexto: str) -> None:
    remover_seguro(_backend, nome_armazenado, contexto, "foto")
