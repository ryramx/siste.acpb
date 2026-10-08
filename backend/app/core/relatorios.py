import csv
import io
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

FormatoRelatorio = Literal["csv", "xlsx", "pdf"]

MIME_POR_FORMATO = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def _celula_como_texto(valor: Any) -> str:
    """Escreve o valor como uma pessoa no Brasil lê, no CSV e no PDF.

    `str()` puro gerava "576.22", "True" e "2026-01-11". No Excel em português o ponto é
    separador de milhar, então "576.22" abria como 57622 -- o relatório financeiro saía com
    valores errados. A vírgula decimal vai sem separador de milhar para o Excel ler como número.
    """
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "Sim" if valor else "Não"
    if isinstance(valor, (Decimal, float)):
        return f"{valor:.2f}".replace(".", ",")
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y %H:%M")
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    return str(valor)


def _linhas_como_texto(colunas: list[str], linhas: list[dict[str, Any]]) -> list[list[str]]:
    return [[_celula_como_texto(row.get(c)) for c in colunas] for row in linhas]


def gerar_csv(colunas: list[str], linhas: list[dict[str, Any]]) -> bytes:
    buffer = io.StringIO()
    # Ponto e virgula, nao virgula: o Excel em portugues usa a virgula como separador decimal
    # e por isso espera ';' entre as colunas. Com ',' ele nao divide nada e a planilha abre com
    # tudo espremido numa coluna so -- que era o "arquivo baguncado" relatado no teste visual.
    # O BOM abaixo ja existia pela mesma razao (fazer o Excel reconhecer o UTF-8).
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(colunas)
    writer.writerows(_linhas_como_texto(colunas, linhas))
    return buffer.getvalue().encode("utf-8-sig")


def gerar_xlsx(colunas: list[str], linhas: list[dict[str, Any]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(colunas)
    for linha in linhas:
        ws.append([linha.get(c) for c in colunas])

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def gerar_pdf(titulo: str, colunas: list[str], linhas: list[dict[str, Any]]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    estilos = getSampleStyleSheet()

    dados_tabela = [colunas] + _linhas_como_texto(colunas, linhas)
    tabela = Table(dados_tabela, repeatRows=1)
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
            ]
        )
    )

    doc.build([Paragraph(titulo, estilos["Heading2"]), tabela])
    return buffer.getvalue()


def gerar_relatorio(
    formato: FormatoRelatorio, titulo: str, colunas: list[str], linhas: list[dict[str, Any]]
) -> bytes:
    if formato == "csv":
        return gerar_csv(colunas, linhas)
    if formato == "xlsx":
        return gerar_xlsx(colunas, linhas)
    return gerar_pdf(titulo, colunas, linhas)
