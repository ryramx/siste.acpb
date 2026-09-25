"""Leitura segura de arquivos enviados (RQ-05 da rodada de QA de 25/09/2026).

Duas proteções que as rotas de upload não tinham:

- **Tamanho.** `await arquivo.read()` trazia o arquivo inteiro para a memória antes de medir.
  Aqui a leitura é em partes, e para assim que passa do limite, respondendo 413.
- **Tipo pelo conteúdo.** O tipo vinha do `Content-Type` que o navegador declara, e um `.exe`
  renomeado para `.pdf` passava. Agora os primeiros bytes do arquivo (a "assinatura" de cada
  formato) precisam bater com um tipo aceito, e é esse tipo real que decide a extensão salva.

O nome enviado pelo usuário nunca vira caminho: a chave salva é sempre um UUID (ver
anexos_storage e foto_pessoa_storage).
"""

from fastapi import HTTPException, UploadFile, status

_TAMANHO_DA_PARTE = 64 * 1024

# Assinaturas dos formatos aceitos em algum upload do sistema.
_ASSINATURAS: list[tuple[bytes, str]] = [
    (b"%PDF", "application/pdf"),
    (b"\x89PNG\r\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
]


def detectar_tipo(conteudo: bytes) -> str | None:
    for assinatura, tipo in _ASSINATURAS:
        if conteudo.startswith(assinatura):
            return tipo
    return None


async def ler_com_limite(arquivo: UploadFile, limite_bytes: int, limite_mb: int) -> bytes:
    """Lê o arquivo em partes e desiste assim que passa de `limite_bytes` (413)."""
    partes: list[bytes] = []
    total = 0
    while parte := await arquivo.read(_TAMANHO_DA_PARTE):
        total += len(parte)
        if total > limite_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Arquivo passa do tamanho máximo de {limite_mb}MB",
            )
        partes.append(parte)
    if total == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio")
    return b"".join(partes)


def exigir_tipo_real(conteudo: bytes, permitidos: dict[str, str]) -> str:
    """Devolve o tipo real do arquivo, ou recusa (400) se não for um dos permitidos."""
    tipo = detectar_tipo(conteudo)
    if tipo not in permitidos:
        raise HTTPException(
            status_code=400,
            detail=(
                "O conteúdo do arquivo não é de um tipo aceito "
                f"({', '.join(sorted(permitidos))}), mesmo que a extensão pareça certa"
            ),
        )
    return tipo
