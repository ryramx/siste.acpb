#!/usr/bin/env bash
#
# Backup do banco de producao (Neon) e envio para o Cloudflare R2.
#
# O plano gratuito do Neon nao oferece restauracao de longo prazo: sem este backup, um
# erro humano (DELETE sem WHERE, migration destrutiva) e definitivo. Ver BACKUP_E_RESTAURACAO.md
# para a politica (retencao, teste de restauracao) — este script e so a execucao.
#
# Uso:
#   DATABASE_URL=postgresql://... \
#   S3_ENDPOINT_URL=https://<conta>.r2.cloudflarestorage.com \
#   S3_BUCKET=acpb-backups \
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
#   ./scripts/backup.sh
#
# Requisitos: pg_dump (client do Postgres, versao >= a do servidor) e awscli.

set -euo pipefail

: "${DATABASE_URL:?defina DATABASE_URL com a connection string do Postgres}"
: "${S3_ENDPOINT_URL:?defina S3_ENDPOINT_URL (endpoint S3 do R2)}"
: "${S3_BUCKET:?defina S3_BUCKET}"
: "${AWS_ACCESS_KEY_ID:?defina AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?defina AWS_SECRET_ACCESS_KEY}"

# O bucket vai no caminho, nao como subdominio: o Supabase nao tem um DNS por bucket,
# e o awscli usa virtual-host por padrao. O R2 aceita as duas formas.
export AWS_S3_ADDRESSING_STYLE=path

RETENCAO_DIAS="${RETENCAO_DIAS:-30}"
CARIMBO="$(date -u +%Y%m%d_%H%M%S)"
ARQUIVO="acpb_db_${CARIMBO}.dump"
DESTINO="$(mktemp -d)"
trap 'rm -rf "$DESTINO"' EXIT

echo "[1/3] Gerando dump..."
# -Fc: formato custom, restauravel com pg_restore e comprimido.
pg_dump --format=custom --no-owner --no-privileges --file="${DESTINO}/${ARQUIVO}" "$DATABASE_URL"

TAMANHO=$(wc -c < "${DESTINO}/${ARQUIVO}")
# Um dump saudavel deste sistema tem dezenas de KB. Abaixo disso, algo falhou sem
# retornar erro — enviar um backup vazio e pior que nao ter backup, porque da falsa
# seguranca e ainda pode expirar um backup bom pela politica de retencao.
if [ "$TAMANHO" -lt 10000 ]; then
  echo "ERRO: dump suspeito (${TAMANHO} bytes). Abortando sem enviar." >&2
  exit 1
fi
echo "      dump gerado: ${TAMANHO} bytes"

echo "[2/3] Enviando para o R2..."
aws s3 cp "${DESTINO}/${ARQUIVO}" "s3://${S3_BUCKET}/postgres/${ARQUIVO}" \
  --endpoint-url "$S3_ENDPOINT_URL"

echo "[3/3] Expirando backups com mais de ${RETENCAO_DIAS} dias..."
LIMITE=$(date -u -d "${RETENCAO_DIAS} days ago" +%Y%m%d 2>/dev/null || date -u -v-"${RETENCAO_DIAS}"d +%Y%m%d)
aws s3 ls "s3://${S3_BUCKET}/postgres/" --endpoint-url "$S3_ENDPOINT_URL" \
  | awk '{print $4}' | grep -E '^acpb_db_[0-9]{8}_[0-9]{6}\.dump$' \
  | while read -r antigo; do
      data="${antigo#acpb_db_}"; data="${data%%_*}"
      if [ "$data" -lt "$LIMITE" ]; then
        echo "      removendo ${antigo}"
        aws s3 rm "s3://${S3_BUCKET}/postgres/${antigo}" --endpoint-url "$S3_ENDPOINT_URL"
      fi
    done

echo "OK: backup ${ARQUIVO} concluido."
