import { apiClient } from './apiClient';

/** Formatos aceitos pelo backend (`FormatoRelatorio` em app/core/relatorios.py). */
export type ReportFormat = 'csv' | 'xlsx' | 'pdf';

/** Cada chave corresponde a uma rota GET /relatorios/{chave}. */
export type ReportKey = 'financeiro' | 'pessoas' | 'projetos' | 'eventos';

export type ReportFilters = Record<string, string | undefined>;

/**
 * Monta o caminho da requisição, descartando filtros vazios — enviar
 * `?cidade=` faria o backend filtrar por string vazia em vez de não filtrar.
 * Exportada separadamente da chamada de rede para poder ser testada sem DOM.
 */
export function buildReportPath(
  key: ReportKey,
  formato: ReportFormat,
  filtros: ReportFilters = {}
): string {
  const params = new URLSearchParams({ formato });
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') {
      params.set(chave, valor);
    }
  }
  return `/relatorios/${key}?${params.toString()}`;
}

/** Nome sugerido ao navegador. O backend manda o mesmo nome no Content-Disposition,
 * mas como o arquivo é baixado via blob autenticado esse header não chega ao <a download>. */
export function buildReportFilename(key: ReportKey, formato: ReportFormat): string {
  return `relatorio_${key}.${formato}`;
}

/** Entrega o blob ao navegador como download. Isolado para que `download` possa
 * ser testado com este comportamento substituído. */
function salvarArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const reportService = {
  /** Baixa um relatório. O endpoint exige a permissão do módulo correspondente
   * (ex.: /relatorios/financeiro exige financeiro.visualizar), então um 403 aqui
   * significa que o usuário não pode ver aquele módulo. */
  async download(
    key: ReportKey,
    formato: ReportFormat,
    filtros: ReportFilters = {}
  ): Promise<void> {
    const blob = await apiClient.getBlob(buildReportPath(key, formato, filtros));
    salvarArquivo(blob, buildReportFilename(key, formato));
  }
};
