import csv
import io
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


def _linhas_como_texto(colunas: list[str], linhas: list[dict[str, Any]]) -> list[list[str]]:
    return [[("" if row.get(c) is None else str(row.get(c))) for c in colunas] for row in linhas]


def gerar_csv(colunas: list[str], linhas: list[dict[str, Any]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(colunas)
    writer.writerows(_linhas_como_texto(colunas, linhas))
    return buffer.getvalue().encode("utf-8-sig")  # BOM para abrir corretamente no Excel


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
