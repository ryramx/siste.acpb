import { describe, it, expect } from 'vitest';
import { ehMenorDeIdade, idadeEmAnos } from './idade';

const hoje = new Date(2026, 8, 23); // 23/09/2026

describe('idadeEmAnos', () => {
  it('conta anos completos', () => {
    expect(idadeEmAnos('2000-01-01', hoje)).toBe(26);
    expect(idadeEmAnos('2010-09-23', hoje)).toBe(16);
  });

  it('desconta quem ainda nao fez aniversario no ano', () => {
    expect(idadeEmAnos('2008-09-24', hoje)).toBe(17);
    expect(idadeEmAnos('2008-09-23', hoje)).toBe(18);
    expect(idadeEmAnos('2008-12-31', hoje)).toBe(17);
  });

  it('devolve null sem data utilizavel', () => {
    expect(idadeEmAnos('')).toBeNull();
    expect(idadeEmAnos(null)).toBeNull();
    expect(idadeEmAnos(undefined)).toBeNull();
    expect(idadeEmAnos('data invalida')).toBeNull();
  });
});

describe('ehMenorDeIdade', () => {
  it('a virada dos 18 acontece no proprio aniversario', () => {
    // Quem completa 18 hoje ja e maior hoje -- por isso a conta e por comparacao de data e
    // nao por divisao de dias, que erraria este caso nos anos bissextos.
    expect(ehMenorDeIdade('2008-09-23', hoje)).toBe(false);
    expect(ehMenorDeIdade('2008-09-24', hoje)).toBe(true);
  });

  it('crianca e adolescente sao menores', () => {
    expect(ehMenorDeIdade('2015-03-10', hoje)).toBe(true);
    expect(ehMenorDeIdade('2009-06-01', hoje)).toBe(true);
  });

  it('sem data de nascimento nao se afirma que e menor', () => {
    // O campo de responsavel fica escondido ate a data ser informada, em vez de aparecer
    // para todo cadastro novo, que comeca sem data.
    expect(ehMenorDeIdade('', hoje)).toBe(false);
    expect(ehMenorDeIdade(null, hoje)).toBe(false);
  });

  it('nao confunde nascimento no dia 1 por causa de fuso', () => {
    // `new Date('2009-01-01')` e meia-noite UTC, que no Brasil e 31/12/2008 -- a idade
    // sairia um ano errada nessa borda se a data fosse lida por construtor.
    expect(idadeEmAnos('2009-01-01', new Date(2026, 0, 1))).toBe(17);
  });
});
