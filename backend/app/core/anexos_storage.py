import uuid

from app.core.config import settings
from app.core.object_storage import criar_backend, remover_seguro

TIPOS_PERMITIDOS = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
}

TAMANHO_MAXIMO_BYTES = settings.ANEXOS_TAMANHO_MAXIMO_MB * 1024 * 1024

# Disco local em desenvolvimento, object storage em produção — ver app/core/object_storage.py.
_backend = criar_backend(settings.ANEXOS_STORAGE_DIR, "anexos_financeiros")


def gerar_nome_armazenado(tipo_mime: str) -> str:
    extensao = TIPOS_PERMITIDOS[tipo_mime]
    return f"{uuid.uuid4().hex}{extensao}"


def salvar_conteudo(nome_armazenado: str, conteudo: bytes, tipo_mime: str) -> None:
    _backend.salvar(nome_armazenado, conteudo, tipo_mime)


def ler_conteudo(nome_armazenado: str) -> bytes | None:
    """Retorna os bytes do anexo, ou None se o arquivo não existir no armazenamento."""
    return _backend.ler(nome_armazenado)


def remover_arquivo(nome_armazenado: str) -> None:
    _backend.remover(nome_armazenado)


def remover_arquivo_seguro(nome_armazenado: str, contexto: str) -> None:
    remover_seguro(_backend, nome_armazenado, contexto, "anexo")
