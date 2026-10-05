import { afterEach, describe, expect, it, vi } from 'vitest';
import { financialService } from './domainServices';
import { apiClient } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('financialService.saldoEmCaixa', () => {
  it('le o saldo da mesma rota do dashboard geral', async () => {
    // Recalcular aqui foi o que fez os dois dashboards mostrarem valores diferentes com o
    // mesmo nome. Lendo da mesma rota, eles nao tem como divergir.
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ saldo_financeiro: 11434.56 });
    expect(await financialService.saldoEmCaixa()).toBe(11434.56);
    expect(get).toHaveBeenCalledWith('/dashboard/resumo');
  });
});
