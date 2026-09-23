import { describe, it, expect } from 'vitest';
import { fraseDoMomento, periodoDoDia, saudacao } from './saudacao';

const em = (hora: number) => new Date(2026, 8, 23, hora, 30);

describe('saudacao', () => {
  it('cobre as três faixas do dia', () => {
    expect(saudacao(em(8))).toBe('Bom dia');
    expect(saudacao(em(15))).toBe('Boa tarde');
    expect(saudacao(em(21))).toBe('Boa noite');
  });

  it('trata as viradas de faixa', () => {
    expect(saudacao(new Date(2026, 8, 23, 4, 59))).toBe('Boa noite');
    expect(saudacao(new Date(2026, 8, 23, 5, 0))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 8, 23, 11, 59))).toBe('Bom dia');
    expect(saudacao(new Date(2026, 8, 23, 12, 0))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 8, 23, 17, 59))).toBe('Boa tarde');
    expect(saudacao(new Date(2026, 8, 23, 18, 0))).toBe('Boa noite');
  });

  it('continua na noite depois da meia-noite', () => {
    expect(periodoDoDia(new Date(2026, 8, 23, 0, 10))).toBe('noite');
    expect(periodoDoDia(new Date(2026, 8, 23, 3, 0))).toBe('noite');
  });
});

describe('fraseDoMomento', () => {
  it('escolhe uma frase do período', () => {
    expect(fraseDoMomento(em(8), 0)).toContain('café');
    expect(fraseDoMomento(em(15), 0)).toContain('Metade do dia');
    expect(fraseDoMomento(em(21), 0)).toContain('Fechando o dia');
  });

  it('nunca estoura a lista, mesmo com índice alto', () => {
    expect(fraseDoMomento(em(8), 99)).toBeTruthy();
  });

  it('sem índice, devolve alguma frase', () => {
    expect(fraseDoMomento(em(15))).toMatch(/Pau-Brasil/);
  });
});
