import { describe, it, expect } from 'vitest';
import {
  formatarData,
  formatarMoeda,
  formatarMoedaComSinal,
  participacao,
  somarValores
} from './dinheiro';

// O Intl separa "R$" do número com espaço não quebrável.
const sem = (s: string) => s.replace(/ /g, ' ');

describe('formatarMoeda', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(sem(formatarMoeda(500))).toBe('R$ 500,00');
    expect(sem(formatarMoeda(9999999999.99))).toBe('R$ 9.999.999.999,99');
    expect(sem(formatarMoeda(10000000644.44))).toBe('R$ 10.000.000.644,44');
  });

  it('põe o sinal antes do símbolo', () => {
    expect(sem(formatarMoedaComSinal(11.11, true))).toBe('+ R$ 11,11');
    expect(sem(formatarMoedaComSinal(-11.11, false))).toBe('- R$ 11,11');
  });
});

describe('somarValores', () => {
  it('soma exato ao centavo', () => {
    expect(somarValores([0.1, 0.2])).toBe(0.3);
    expect(somarValores([9999999999.99, 500, 11.11, 0.02])).toBe(10000000511.12);
  });
});

describe('formatarData', () => {
  it('troca ISO por dia/mês/ano sem cair no dia anterior', () => {
    expect(formatarData('2026-09-25')).toBe('25/09/2026');
    expect(formatarData('2026-01-01T00:00:00')).toBe('01/01/2026');
    expect(formatarData(null)).toBe('—');
  });
});

describe('participacao', () => {
  it('mostra duas casas', () => {
    expect(participacao(1, 3).texto).toBe('33,33%');
  });

  it('não esconde um valor pequeno ao lado de um enorme', () => {
    const total = somarValores([10000000000, 0.02]);
    const p = participacao(0.02, total);
    expect(p.texto).toBe('< 0,01%');
    expect(p.largura).toBeGreaterThan(0);
  });

  it('zero continua zero', () => {
    expect(participacao(0, 100)).toEqual({ texto: '0,00%', largura: 0 });
  });
});
