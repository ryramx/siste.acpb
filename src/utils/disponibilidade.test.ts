import { describe, it, expect } from 'vitest';
import {
  OPCOES_BASE,
  alternarOpcao,
  estaSelecionada,
  juntarDisponibilidade,
  montarOpcoes,
  normalizar,
  separarDisponibilidade
} from './disponibilidade';

describe('separarDisponibilidade', () => {
  it('quebra o texto guardado nas opcoes que o compoem', () => {
    expect(separarDisponibilidade('Sábado à tarde, Domingo')).toEqual([
      'Sábado à tarde',
      'Domingo'
    ]);
  });

  it('tolera espacos, virgulas sobrando e vazio', () => {
    expect(separarDisponibilidade('  Domingo ,, Sábado de manhã , ')).toEqual([
      'Domingo',
      'Sábado de manhã'
    ]);
    expect(separarDisponibilidade('')).toEqual([]);
    expect(separarDisponibilidade(null)).toEqual([]);
  });

  it('vai e volta sem alterar o conteudo', () => {
    const texto = 'Manhãs de semana, Sábado à tarde';
    expect(juntarDisponibilidade(separarDisponibilidade(texto))).toBe(texto);
  });
});

describe('juntarDisponibilidade', () => {
  it('descarta entradas vazias', () => {
    expect(juntarDisponibilidade(['Domingo', '  ', ''])).toBe('Domingo');
  });

  it('nada marcado vira string vazia, que o service converte em null', () => {
    expect(juntarDisponibilidade([])).toBe('');
  });
});

describe('normalizar', () => {
  it('ignora caixa, acento e espaco repetido', () => {
    expect(normalizar('Sábado à Tarde')).toBe(normalizar('sabado  a tarde'));
  });
});

describe('montarOpcoes', () => {
  it('mantem a lista base sempre nas mesmas posicoes', () => {
    const opcoes = montarOpcoes(OPCOES_BASE, ['Plantão de feriado']);
    expect(opcoes.slice(0, OPCOES_BASE.length)).toEqual(OPCOES_BASE);
    expect(opcoes).toContain('Plantão de feriado');
  });

  it('nao duplica a mesma opcao escrita de outro jeito', () => {
    // O caso real: alguem digita "sabado a tarde" sem acento e sem maiuscula.
    const opcoes = montarOpcoes(OPCOES_BASE, ['sabado a tarde', 'SÁBADO À TARDE']);
    const quantas = opcoes.filter((o) => normalizar(o) === normalizar('Sábado à tarde')).length;
    expect(quantas).toBe(1);
    // A grafia preservada e a primeira vista, ou seja, a da lista base.
    expect(opcoes).toContain('Sábado à tarde');
  });

  it('inclui o que so existe neste voluntario, para nao sumir da tela', () => {
    const opcoes = montarOpcoes(OPCOES_BASE, [], ['Quando a igreja chamar']);
    expect(opcoes).toContain('Quando a igreja chamar');
  });

  it('descarta vazios vindos de qualquer origem', () => {
    expect(montarOpcoes(['', '  '], [])).toEqual([]);
  });
});

describe('alternarOpcao', () => {
  it('marca e desmarca', () => {
    const marcada = alternarOpcao('Domingo', []);
    expect(marcada).toEqual(['Domingo']);
    expect(alternarOpcao('Domingo', marcada)).toEqual([]);
  });

  it('desmarca mesmo que a grafia difira da guardada', () => {
    // Opcao antiga gravada sem acento, caixa marcada na tela com a grafia da lista base.
    expect(alternarOpcao('Sábado à tarde', ['sabado a tarde'])).toEqual([]);
  });

  it('preserva a ordem de quem ja estava marcado', () => {
    expect(alternarOpcao('Domingo', ['Manhãs de semana'])).toEqual([
      'Manhãs de semana',
      'Domingo'
    ]);
  });
});

describe('estaSelecionada', () => {
  it('compara ignorando acento e caixa', () => {
    expect(estaSelecionada('Sábado à tarde', ['SABADO A TARDE'])).toBe(true);
    expect(estaSelecionada('Domingo', ['Sábado à tarde'])).toBe(false);
  });
});
