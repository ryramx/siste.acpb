import { describe, it, expect } from 'vitest';
import { formatarValor, numeroParaValor, valorParaNumero } from './mascaras';

describe('formatarValor', () => {
  it('preenche da direita para a esquerda, como no aplicativo do banco', () => {
    expect(formatarValor('1')).toBe('0,01');
    expect(formatarValor('12')).toBe('0,12');
    expect(formatarValor('123')).toBe('1,23');
    expect(formatarValor('12345')).toBe('123,45');
  });

  it('separa os milhares', () => {
    expect(formatarValor('123456')).toBe('1.234,56');
    expect(formatarValor('123456789')).toBe('1.234.567,89');
  });

  it('descarta o que nao for digito', () => {
    // A pessoa cola "R$ 1.234,56" vindo de outro lugar.
    expect(formatarValor('R$ 1.234,56')).toBe('1.234,56');
    expect(formatarValor('abc')).toBe('');
  });

  it('come os zeros da frente, que era o caso da tela', () => {
    // Digitar "020" mostrava literalmente 020 no campo type="number".
    expect(formatarValor('020')).toBe('0,20');
    expect(formatarValor('000150')).toBe('1,50');
  });

  it('campo vazio nao vira 0,00', () => {
    // Mostrar "0,00" num campo em branco faria parecer preenchido, e o required nao
    // impediria de salvar.
    expect(formatarValor('')).toBe('');
  });

  it('para de aceitar digitos no teto', () => {
    expect(formatarValor('9'.repeat(12))).toBe('9.999.999.999,99');
    expect(formatarValor('9'.repeat(30))).toBe('9.999.999.999,99');
  });
});

describe('valorParaNumero', () => {
  it('devolve reais, que e o que o backend recebe', () => {
    expect(valorParaNumero('1.234,56')).toBe(1234.56);
    expect(valorParaNumero('0,01')).toBe(0.01);
    expect(valorParaNumero('150,00')).toBe(150);
  });

  it('vazio vale zero', () => {
    expect(valorParaNumero('')).toBe(0);
    expect(valorParaNumero('R$')).toBe(0);
  });
});

describe('numeroParaValor', () => {
  it('abre o formulario de edicao com o valor ja mascarado', () => {
    expect(numeroParaValor(1234.56)).toBe('1.234,56');
    expect(numeroParaValor(150)).toBe('150,00');
    expect(numeroParaValor(0.05)).toBe('0,05');
  });

  it('nao perde centavo por ponto flutuante', () => {
    // 8.87 * 100 da 886.9999... em ponto flutuante; truncar exibiria 8,86.
    expect(numeroParaValor(8.87)).toBe('8,87');
    expect(numeroParaValor(0.29)).toBe('0,29');
  });

  it('trata ausencia de valor, e o zero, sem escrever nada', () => {
    expect(numeroParaValor(null)).toBe('');
    expect(numeroParaValor(undefined)).toBe('');
    expect(numeroParaValor(NaN)).toBe('');
    expect(numeroParaValor(0)).toBe('');
  });
});

describe('ida e volta', () => {
  it('formatar e desformatar preserva o valor', () => {
    for (const reais of [0.01, 0.99, 1, 150, 1234.56, 999999.99]) {
      expect(valorParaNumero(numeroParaValor(reais))).toBe(reais);
    }
  });
});
