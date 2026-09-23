import { describe, expect, it, vi, afterEach } from 'vitest';
import { financialService } from './domainServices';
import { apiClient } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('financialService.update', () => {
  it('traduz cada campo para o nome que o backend espera', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', {
      description: 'Conta de luz',
      amount: 150.5,
      date: '2026-09-23',
      status: 'PENDENTE',
      paymentMethod: 'Boleto',
      categoryId: '7',
      accountId: '3'
    });

    expect(put).toHaveBeenCalledWith('/movimentacoes-financeiras/42', {
      descricao: 'Conta de luz',
      valor: 150.5,
      data_movimentacao: '2026-09-23',
      status: 'PENDENTE',
      forma_pagamento: 'Boleto',
      categoria_id: 7,
      conta_financeira_id: 3
    });
  });

  it('envia so o que mudou, sem apagar o resto', async () => {
    // A correcao de um erro de digitacao nao deve encostar em categoria nem em conta.
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { description: 'Conta de energia' });

    expect(put).toHaveBeenCalledWith('/movimentacoes-financeiras/42', {
      descricao: 'Conta de energia'
    });
  });

  it('converte os ids para numero, que e o tipo do schema', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { categoryId: '7', accountId: '3' });

    const corpo = put.mock.calls[0][1] as Record<string, unknown>;
    expect(corpo.categoria_id).toBe(7);
    expect(corpo.conta_financeira_id).toBe(3);
  });

  it('corrigir o valor para zero nao e confundido com "nao mexer"', async () => {
    // `if (data.amount !== undefined)` e nao `if (data.amount)`: com o teste ao contrario,
    // zerar um lancamento silenciosamente nao faria nada.
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { amount: 0 });

    expect(put).toHaveBeenCalledWith('/movimentacoes-financeiras/42', { valor: 0 });
  });

  it('vincula o lancamento a um projeto', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { projectId: '5' });

    expect(put).toHaveBeenCalledWith('/movimentacoes-financeiras/42', { projeto_id: 5 });
  });

  it('projeto vazio desvincula, em vez de ser ignorado', async () => {
    // E o unico jeito de corrigir um lancamento atribuido ao projeto errado. Com a mesma
    // regra de categoria (`data.x ? {...} : {}`), desvincular seria impossivel pela tela.
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { projectId: '' });

    expect(put).toHaveBeenCalledWith('/movimentacoes-financeiras/42', { projeto_id: null });
  });

  it('nao encosta no projeto quando ele nao foi informado', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await financialService.update('42', { description: 'Conta de luz' });

    expect(put.mock.calls[0][1]).not.toHaveProperty('projeto_id');
  });

  it('propaga o erro da API para a tela mostrar o motivo', async () => {
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Categoria não encontrada'));

    await expect(financialService.update('42', { categoryId: '99' })).rejects.toThrow(
      'Categoria não encontrada'
    );
  });
});

describe('financialService.remove', () => {
  it('exclui o lancamento pelo id', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);

    await financialService.remove('42');

    expect(del).toHaveBeenCalledWith('/movimentacoes-financeiras/42');
  });

  it('propaga a recusa do servidor em vez de fingir sucesso', async () => {
    vi.spyOn(apiClient, 'delete').mockRejectedValue(
      new Error('Não é possível excluir devido a dependências')
    );

    await expect(financialService.remove('42')).rejects.toThrow('dependências');
  });
});
