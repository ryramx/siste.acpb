import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildReportFilename, buildReportPath, reportService } from './reportService';
import { apiClient } from './apiClient';

describe('buildReportPath', () => {
  it('sempre inclui o formato', () => {
    expect(buildReportPath('pessoas', 'csv')).toBe('/relatorios/pessoas?formato=csv');
  });

  it('descarta filtros vazios ou indefinidos', () => {
    // Enviar ?cidade= faria o backend filtrar por string vazia em vez de nao filtrar.
    const path = buildReportPath('pessoas', 'xlsx', { cidade: '', estado: undefined });
    expect(path).toBe('/relatorios/pessoas?formato=xlsx');
  });

  it('inclui os filtros preenchidos', () => {
    const path = buildReportPath('financeiro', 'pdf', {
      data_inicio: '2026-01-01',
      data_fim: '2026-01-31',
      tipo: 'ENTRADA'
    });
    expect(path).toContain('formato=pdf');
    expect(path).toContain('data_inicio=2026-01-01');
    expect(path).toContain('data_fim=2026-01-31');
    expect(path).toContain('tipo=ENTRADA');
  });

  it('escapa valores com caracteres especiais', () => {
    const path = buildReportPath('pessoas', 'csv', { cidade: 'São Paulo' });
    expect(path).toContain('cidade=S%C3%A3o+Paulo');
  });
});

describe('buildReportFilename', () => {
  it('nomeia o arquivo pelo relatorio e formato', () => {
    expect(buildReportFilename('eventos', 'xlsx')).toBe('relatorio_eventos.xlsx');
  });
});

describe('reportService.download', () => {
  beforeEach(() => {
    // jsdom nao implementa createObjectURL/revokeObjectURL.
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('busca o blob no endpoint correto e dispara o download', async () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' });
    const getBlob = vi.spyOn(apiClient, 'getBlob').mockResolvedValue(blob);
    const click = vi.fn();
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation(((tag: string) => {
      const el = Object.assign(document.createElementNS('http://www.w3.org/1999/xhtml', tag), {
        click
      });
      return el;
    }) as typeof document.createElement);

    await reportService.download('financeiro', 'csv', { tipo: 'SAIDA' });

    expect(getBlob).toHaveBeenCalledWith('/relatorios/financeiro?formato=csv&tipo=SAIDA');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('propaga erro do backend (ex.: 403 sem permissao do modulo)', async () => {
    vi.spyOn(apiClient, 'getBlob').mockRejectedValue(new Error('Sem permissão'));
    await expect(reportService.download('financeiro', 'pdf')).rejects.toThrow('Sem permissão');
  });
});
