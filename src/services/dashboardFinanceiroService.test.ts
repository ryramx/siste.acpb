import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryDePeriodo,
  dashboardFinanceiroService,
  periodoDe
} from './dashboardFinanceiroService';
import { apiClient, ApiError } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildQueryDePeriodo', () => {
  it('nao acrescenta query quando nao ha periodo', () => {
    expect(buildQueryDePeriodo()).toBe('');
    expect(buildQueryDePeriodo({})).toBe('');
  });

  it('descarta filtro vazio, que faria o backend filtrar por string vazia', () => {
    expect(buildQueryDePeriodo({ dataInicio: '', dataFim: '' })).toBe('');
  });

  it('monta as duas datas', () => {
    expect(buildQueryDePeriodo({ dataInicio: '2026-01-01', dataFim: '2026-09-24' })).toBe(
      '?data_inicio=2026-01-01&data_fim=2026-09-24'
    );
  });
});

describe('periodoDe', () => {
  const hoje = new Date('2026-09-24T12:00:00Z');

  it('"tudo" nao filtra nada', () => {
    expect(periodoDe('TUDO', hoje)).toEqual({});
  });

  it('"este ano" comeca em 1 de janeiro', () => {
    expect(periodoDe('ANO', hoje)).toEqual({ dataInicio: '2026-01-01', dataFim: '2026-09-24' });
  });

  it('"12 meses" volta 11 meses e comeca no primeiro dia', () => {
    // 11 e nao 12: contando o mes corrente, o grafico mostra 12 colunas.
    expect(periodoDe('DOZE_MESES', hoje)).toEqual({
      dataInicio: '2025-10-01',
      dataFim: '2026-09-24'
    });
  });

  it('"6 meses" volta 5 meses', () => {
    expect(periodoDe('SEIS_MESES', hoje)).toEqual({
      dataInicio: '2026-04-01',
      dataFim: '2026-09-24'
    });
  });
});

describe('dashboardFinanceiroService.evolucaoMensal', () => {
  it('deriva o saldo e o rotulo do mes', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([
      { ano: 2026, mes: 1, receitas: 5000, despesas: 3200 },
      { ano: 2026, mes: 12, receitas: 1000, despesas: 1500 }
    ]);

    const pontos = await dashboardFinanceiroService.evolucaoMensal();

    expect(pontos[0]).toMatchObject({ rotulo: 'jan/26', saldo: 1800 });
    // Saldo negativo precisa sobreviver: e o caso que a diretoria mais quer enxergar.
    expect(pontos[1]).toMatchObject({ rotulo: 'dez/26', saldo: -500 });
  });

  it('repassa o periodo na query', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([]);
    await dashboardFinanceiroService.evolucaoMensal({ dataInicio: '2026-01-01' });
    expect(get).toHaveBeenCalledWith('/dashboard/financeiro/evolucao?data_inicio=2026-01-01');
  });
});

describe('dashboardFinanceiroService.porCategoria', () => {
  it('traduz RECEITA para ENTRADA, que e o valor gravado no banco', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([]);
    await dashboardFinanceiroService.porCategoria('RECEITA');
    expect(get).toHaveBeenCalledWith('/dashboard/financeiro/por-categoria?tipo=ENTRADA');
  });

  it('combina periodo e tipo na mesma query', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([]);
    await dashboardFinanceiroService.porCategoria('DESPESA', { dataInicio: '2026-01-01' });
    expect(get).toHaveBeenCalledWith(
      '/dashboard/financeiro/por-categoria?data_inicio=2026-01-01&tipo=SAIDA'
    );
  });

  it('ordena do maior para o menor, que e o que torna a barra comparavel', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([
      { categoria_id: 1, categoria_nome: 'Energia', tipo: 'SAIDA', total: 300 },
      { categoria_id: 2, categoria_nome: 'Aluguel', tipo: 'SAIDA', total: 1200 },
      { categoria_id: 3, categoria_nome: 'Material', tipo: 'SAIDA', total: 800 }
    ]);

    const linhas = await dashboardFinanceiroService.porCategoria('DESPESA');

    expect(linhas.map((l) => l.categoria)).toEqual(['Aluguel', 'Material', 'Energia']);
    expect(linhas[0]).toMatchObject({ categoriaId: '2', tipo: 'DESPESA', total: 1200 });
  });

  it('propaga 403 de quem nao pode ver o financeiro', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError(403, 'Sem permissão'));
    await expect(dashboardFinanceiroService.porCategoria('RECEITA')).rejects.toThrow(
      'Sem permissão'
    );
  });
});
