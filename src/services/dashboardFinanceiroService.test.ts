import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryDePeriodo,
  dashboardFinanceiroService,
  intervaloDoAno,
  intervaloDoPeriodo,
  preencherMeses
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

describe('intervaloDoAno', () => {
  const hoje = new Date(2026, 9, 5, 12, 0);

  it('no ano corrente, vai de janeiro ate hoje', () => {
    // Meses que ainda nao chegaram ficariam como zero, lidos como "nao entrou nada".
    expect(intervaloDoAno(2026, hoje)).toEqual({ dataInicio: '2026-01-01', dataFim: '2026-10-05' });
  });

  it('em ano passado, vai ate dezembro', () => {
    expect(intervaloDoAno(2025, hoje)).toEqual({ dataInicio: '2025-01-01', dataFim: '2025-12-31' });
  });

  it('usa a data local, nao a UTC', () => {
    // 22h de 5/10 no horario local ja e dia 6 em UTC−3. Em CI (fuso UTC) o teste passa dos
    // dois jeitos; ele pega a regressao na maquina de quem desenvolve, no fuso do Brasil.
    expect(intervaloDoAno(2026, new Date(2026, 9, 5, 22, 0)).dataFim).toBe('2026-10-05');
  });
});

describe('intervaloDoPeriodo', () => {
  it('ano inteiro quando nao ha mes', () => {
    expect(intervaloDoPeriodo({ ano: 2026, mes: null })).toEqual({
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31'
    });
  });

  it('um mes vai do dia 1 ao ultimo dia dele', () => {
    expect(intervaloDoPeriodo({ ano: 2026, mes: 9 })).toEqual({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-30'
    });
  });

  it('fevereiro respeita o ano bissexto', () => {
    expect(intervaloDoPeriodo({ ano: 2028, mes: 2 }).dataFim).toBe('2028-02-29');
    expect(intervaloDoPeriodo({ ano: 2026, mes: 2 }).dataFim).toBe('2026-02-28');
  });
});

describe('preencherMeses', () => {
  const setembro = { ano: 2026, mes: 9, receitas: 2000, despesas: 1500 };

  it('completa com zero os meses do filtro sem lancamento', () => {
    const meses = preencherMeses([setembro], { dataInicio: '2026-07-01', dataFim: '2026-10-05' });
    expect(meses.map((m) => m.mes)).toEqual([7, 8, 9, 10]);
    expect(meses[0]).toEqual({ ano: 2026, mes: 7, receitas: 0, despesas: 0 });
    expect(meses[2]).toEqual(setembro);
  });

  it('atravessa a virada do ano', () => {
    const meses = preencherMeses([setembro], { dataInicio: '2025-11-01', dataFim: '2026-10-05' });
    expect(meses).toHaveLength(12);
    expect(meses[0]).toMatchObject({ ano: 2025, mes: 11 });
    expect(meses[11]).toMatchObject({ ano: 2026, mes: 10 });
  });

  it('sem filtro, vai do primeiro ao ultimo mes com movimento', () => {
    const marco = { ano: 2026, mes: 3, receitas: 100, despesas: 0 };
    const meses = preencherMeses([setembro, marco]);
    expect(meses.map((m) => m.mes)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('sem nenhum ponto continua vazio, para o grafico mostrar o estado vazio', () => {
    expect(preencherMeses([], { dataInicio: '2026-01-01', dataFim: '2026-10-05' })).toEqual([]);
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
    expect(pontos[11]).toMatchObject({ rotulo: 'dez/26', saldo: -500 });
    // Os dez meses entre os dois chegam zerados, não omitidos.
    expect(pontos).toHaveLength(12);
    expect(pontos[5]).toMatchObject({ rotulo: 'jun/26', saldo: 0 });
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
