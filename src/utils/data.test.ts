import { describe, expect, it } from 'vitest';
import { hojeIso, instanteUtc, isoLocal } from './data';

describe('isoLocal', () => {
  it('usa o dia do relogio local, mesmo a noite', () => {
    // 22h de 5 de outubro no horário local. Em UTC−3 já é dia 6 em UTC — o `toISOString`
    // devolveria '2026-10-06'. Em CI (fuso UTC) os dois coincidem; o teste pega a
    // regressão na máquina de quem desenvolve, no fuso do Brasil.
    expect(isoLocal(new Date(2026, 9, 5, 22, 30))).toBe('2026-10-05');
  });

  it('completa mes e dia com zero', () => {
    expect(isoLocal(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('hojeIso', () => {
  it('formata o instante recebido', () => {
    expect(hojeIso(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('instanteUtc', () => {
  it('trata horario sem fuso como UTC', () => {
    expect(instanteUtc('2026-10-05T22:24:41').toISOString()).toBe('2026-10-05T22:24:41.000Z');
  });

  it('respeita o fuso quando ele vem na string', () => {
    expect(instanteUtc('2026-10-05T19:24:41-03:00').toISOString()).toBe(
      '2026-10-05T22:24:41.000Z'
    );
    expect(instanteUtc('2026-10-05T22:24:41Z').toISOString()).toBe('2026-10-05T22:24:41.000Z');
  });

  it('aceita microssegundos, como o Python devolve', () => {
    expect(instanteUtc('2026-10-05T22:24:41.123456').getUTCHours()).toBe(22);
  });
});
