import { describe, it, expect } from 'vitest';
import { opcoesStatus, placeholderDescricao, rotuloData } from './lancamento';

describe('rotuloData', () => {
  it('numa receita nunca fala de vencimento nem de pagamento', () => {
    // A queixa original: "Data de Vencimento/Pagamento" num modal de entrada de dinheiro.
    const rotulos = [rotuloData('RECEITA', 'CONFIRMADA'), rotuloData('RECEITA', 'PENDENTE')];
    for (const rotulo of rotulos) {
      expect(rotulo.toLowerCase()).not.toContain('vencimento');
      expect(rotulo.toLowerCase()).not.toContain('pagamento');
      expect(rotulo.toLowerCase()).toContain('recebimento');
    }
  });

  it('distingue o que ja aconteceu do que ainda vai acontecer', () => {
    expect(rotuloData('RECEITA', 'CONFIRMADA')).toBe('Data do recebimento');
    expect(rotuloData('RECEITA', 'PENDENTE')).toBe('Data prevista do recebimento');
    expect(rotuloData('DESPESA', 'CONFIRMADA')).toBe('Data do pagamento');
    // Despesa pendente e o unico caso em que "vencimento" e a palavra certa.
    expect(rotuloData('DESPESA', 'PENDENTE')).toBe('Data de vencimento');
  });

  it('da um rotulo diferente para cada um dos quatro casos', () => {
    const todos = [
      rotuloData('RECEITA', 'CONFIRMADA'),
      rotuloData('RECEITA', 'PENDENTE'),
      rotuloData('DESPESA', 'CONFIRMADA'),
      rotuloData('DESPESA', 'PENDENTE')
    ];
    expect(new Set(todos).size).toBe(4);
  });
});

describe('opcoesStatus', () => {
  it('fala de receber na receita e de pagar na despesa', () => {
    expect(opcoesStatus('RECEITA').map((o) => o.label)).toEqual(['Recebido', 'A receber']);
    expect(opcoesStatus('DESPESA').map((o) => o.label)).toEqual(['Pago', 'A pagar']);
  });

  it('mantem os valores que o backend espera, so o texto muda', () => {
    for (const tipo of ['RECEITA', 'DESPESA'] as const) {
      expect(opcoesStatus(tipo).map((o) => o.value)).toEqual(['CONFIRMADA', 'PENDENTE']);
    }
  });
});

describe('placeholderDescricao', () => {
  it('exemplifica com algo do lado certo do caixa', () => {
    expect(placeholderDescricao('RECEITA')).toContain('Contribuição');
    expect(placeholderDescricao('DESPESA')).toContain('energia');
  });
});
