import { describe, it, expect } from 'vitest';
import { descreverPeriodo, lerPeriodo, periodoNaUrl } from './periodo';

const HOJE = new Date(2026, 8, 25);

describe('lerPeriodo', () => {
  it('sem nada na URL vale o ano atual inteiro', () => {
    expect(lerPeriodo(new URLSearchParams(''), HOJE)).toEqual({ ano: 2026, mes: null });
  });

  it('lê ano e mês', () => {
    expect(lerPeriodo(new URLSearchParams('ano=2025&mes=12'), HOJE)).toEqual({ ano: 2025, mes: 12 });
  });

  it('ignora valor que não serve', () => {
    expect(lerPeriodo(new URLSearchParams('ano=abc&mes=13'), HOJE)).toEqual({ ano: 2026, mes: null });
  });
});

describe('periodoNaUrl e descreverPeriodo', () => {
  it('ano inteiro', () => {
    expect(periodoNaUrl({ ano: 2026, mes: null })).toBe('?ano=2026');
    expect(descreverPeriodo({ ano: 2026, mes: null })).toBe('2026');
  });

  it('um mês', () => {
    expect(periodoNaUrl({ ano: 2026, mes: 9 })).toBe('?ano=2026&mes=9');
    expect(descreverPeriodo({ ano: 2026, mes: 9 })).toBe('Setembro de 2026');
  });
});
