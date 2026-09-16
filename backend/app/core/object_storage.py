"""Camada de armazenamento de arquivos com dois provedores intercambiáveis.

Motivação (deploy gratuito): plataformas de PaaS em plano gratuito têm sistema de
arquivos efêmero — todo redeploy zera o disco. Anexos financeiros são comprovantes
de prestação de contas e não podem sumir sozinhos, então em produção os arquivos vão
para object storage S3-compatível (Cloudflare R2).

Em desenvolvimento e nos testes o provedor continua sendo o disco local, para não
exigir credenciais de nuvem nem rede para rodar a suíte.

A escolha é feita por `STORAGE_BACKEND` (`local` | `s3`) e é transparente para as
rotas: elas só conhecem `salvar`/`ler`/`remover` e uma chave opaca.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)

# As chaves são sempre geradas internamente (uuid4 + extensão de uma lista fechada),
# nunca vêm do cliente. A validação abaixo é defesa em profundidade: se algum dia uma
# chave passar a vir de fora, path traversal falha aqui em vez de escapar do diretório.
_CHAVE_VALIDA = re.compile(r"^[a-f0-9]{32}\.(pdf|png|jpg)$")


def _validar_chave(chave: str) -> str:
    if not _CHAVE_VALIDA.match(chave):
        raise ValueError(f"Chave de armazenamento inválida: {chave!r}")
    return chave


class StorageBackend(Protocol):
    def salvar(self, chave: str, conteudo: bytes, tipo_mime: str) -> None: ...
    def ler(self, chave: str) -> bytes | None: ...
    def remover(self, chave: str) -> None: ...


class LocalStorage:
    """Disco local. Usado em desenvolvimento e nos testes."""

    def __init__(self, diretorio: str) -> None:
        self._diretorio = diretorio

    def _dir(self) -> Path:
        caminho = Path(self._diretorio)
        caminho.mkdir(parents=True, exist_ok=True)
        return caminho

    def _caminho(self, chave: str) -> Path:
        return self._dir() / _validar_chave(chave)

    def salvar(self, chave: str, conteudo: bytes, tipo_mime: str) -> None:
        self._caminho(chave).write_bytes(conteudo)

    def ler(self, chave: str) -> bytes | None:
        caminho = self._caminho(chave)
        if not caminho.exists():
            return None
        return caminho.read_bytes()

    def remover(self, chave: str) -> None:
        caminho = self._caminho(chave)
        if caminho.exists():
            caminho.unlink()


class S3Storage:
    """Object storage S3-compatível (Cloudflare R2). Usado em produção.

    O cliente boto3 é criado sob demanda (não no import) para que a aplicação suba
    em desenvolvimento sem credenciais de nuvem configuradas.
    """

    def __init__(self, prefixo: str) -> None:
        self._prefixo = prefixo.strip("/")
        self._cliente = None

    def _client(self):
        if self._cliente is None:
            import boto3
            from botocore.config import Config

            self._cliente = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                # A região importa para o Supabase (precisa ser a do projeto) e é ignorada
                # pelo R2 — mas o boto3 exige algum valor nos dois casos.
                region_name=settings.S3_REGION,
                config=Config(
                    signature_version="s3v4",
                    # Path-style (bucket no caminho, não como subdomínio). O boto3 usa
                    # virtual-host por padrão, que exigiria um DNS por bucket — o Supabase
                    # não tem isso, e quebraria. O R2 aceita as duas formas, então
                    # path-style serve aos dois provedores.
                    s3={"addressing_style": "path"},
                ),
            )
        return self._cliente

    def _key(self, chave: str) -> str:
        return f"{self._prefixo}/{_validar_chave(chave)}"

    def salvar(self, chave: str, conteudo: bytes, tipo_mime: str) -> None:
        self._client().put_object(
            Bucket=settings.S3_BUCKET,
            Key=self._key(chave),
            Body=conteudo,
            ContentType=tipo_mime,
        )

    def ler(self, chave: str) -> bytes | None:
        from botocore.exceptions import ClientError

        try:
            resposta = self._client().get_object(
                Bucket=settings.S3_BUCKET, Key=self._key(chave)
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return None
            raise
        return resposta["Body"].read()

    def remover(self, chave: str) -> None:
        # delete_object é idempotente no S3: apagar chave inexistente não é erro.
        self._client().delete_object(Bucket=settings.S3_BUCKET, Key=self._key(chave))


def criar_backend(diretorio_local: str, prefixo_s3: str) -> StorageBackend:
    if settings.STORAGE_BACKEND == "s3":
        return S3Storage(prefixo_s3)
    return LocalStorage(diretorio_local)


def remover_seguro(backend: StorageBackend, chave: str, contexto: str, rotulo: str) -> None:
    """Remove um arquivo sem propagar exceção, para limpeza best-effort (arquivo órfão
    após falha de commit, ou arquivo antigo após commit bem-sucedido).

    Nunca deve ser usado para desfazer uma transação já commitada nem para mascarar a
    exceção original de um commit que falhou. Falhas de remoção são apenas logadas,
    para permitir limpeza manual futura.
    """
    try:
        backend.remover(chave)
    except Exception:
        logger.error(
            "Falha ao remover arquivo de %s '%s' (%s). Requer limpeza manual.",
            rotulo,
            chave,
            contexto,
            exc_info=True,
        )
