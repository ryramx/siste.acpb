import logging
import uuid
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

TIPOS_PERMITIDOS = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
}

TAMANHO_MAXIMO_BYTES = settings.ANEXOS_TAMANHO_MAXIMO_MB * 1024 * 1024


def _storage_dir() -> Path:
    caminho = Path(settings.ANEXOS_STORAGE_DIR)
    caminho.mkdir(parents=True, exist_ok=True)
    return caminho


def gerar_nome_armazenado(tipo_mime: str) -> str:
    extensao = TIPOS_PERMITIDOS[tipo_mime]
    return f"{uuid.uuid4().hex}{extensao}"


def caminho_fisico(nome_armazenado: str) -> Path:
    # nome_armazenado é sempre gerado por gerar_nome_armazenado (uuid4 + extensão fixa),
    # nunca o nome enviado pelo usuário — não há risco de path traversal aqui.
    return _storage_dir() / nome_armazenado


def salvar_conteudo(nome_armazenado: str, conteudo: bytes) -> None:
    caminho_fisico(nome_armazenado).write_bytes(conteudo)


def remover_arquivo(nome_armazenado: str) -> None:
    caminho = caminho_fisico(nome_armazenado)
    if caminho.exists():
        caminho.unlink()


def remover_arquivo_seguro(nome_armazenado: str, contexto: str) -> None:
    """Remove um arquivo sem propagar exceção, para limpeza best-effort (arquivo
    órfão após falha de commit, ou arquivo antigo após commit bem-sucedido).

    Nunca deve ser usado para desfazer uma transação já commitada nem para mascarar
    a exceção original de um commit que falhou. Falhas de remoção são apenas
    logadas, para permitir limpeza manual futura.
    """
    try:
        remover_arquivo(nome_armazenado)
    except OSError:
        logger.error(
            "Falha ao remover arquivo físico de anexo '%s' (%s). Requer limpeza manual.",
            nome_armazenado,
            contexto,
            exc_info=True,
        )
