import { describe, it, expect } from 'vitest';
import {
  apenasDigitos,
  cpfValido,
  exibirCEP,
  exibirCPF,
  exibirTelefone,
  formatarCEP,
  formatarCPF,
  formatarTelefone
} from './mascaras';

describe('apenasDigitos', () => {
  it('remove tudo que não for número', () => {
    expect(apenasDigitos('715.147.104-12')).toBe('71514710412');
    expect(apenasDigitos('(81) 99816-4466')).toBe('81998164466');
    expect(apenasDigitos('')).toBe('');
  });
});

describe('formatarCPF', () => {
  it('formata o CPF completo', () => {
    expect(formatarCPF('71514710412')).toBe('715.147.104-12');
  });

  it('aceita entrada parcial, porque roda a cada tecla digitada', () => {
    expect(formatarCPF('7')).toBe('7');
    expect(formatarCPF('715')).toBe('715');
    expect(formatarCPF('7151')).toBe('715.1');
    expect(formatarCPF('7151471')).toBe('715.147.1');
    expect(formatarCPF('715147104')).toBe('715.147.104');
  });

  it('descarta dígitos além do 11º em vez de aceitar um CPF longo', () => {
    expect(formatarCPF('715147104129999')).toBe('715.147.104-12');
  });

  it('é idempotente: reaplicar sobre o valor já formatado não altera', () => {
    expect(formatarCPF('715.147.104-12')).toBe('715.147.104-12');
  });
});

describe('formatarTelefone', () => {
  it('formata celular de 11 dígitos', () => {
    expect(formatarTelefone('81998164466')).toBe('(81) 99816-4466');
  });

  it('formata fixo de 10 dígitos', () => {
    expect(formatarTelefone('8133334444')).toBe('(81) 3333-4444');
  });

  it('só decide o corte do hífen no 11º dígito', () => {
    // Ate o 10o digito nao da para saber se e fixo ou celular.
    expect(formatarTelefone('8199816446')).toBe('(81) 9981-6446');
    expect(formatarTelefone('81998164466')).toBe('(81) 99816-4466');
  });

  it('aceita entrada parcial', () => {
    expect(formatarTelefone('8')).toBe('8');
    expect(formatarTelefone('81')).toBe('81');
    expect(formatarTelefone('819')).toBe('(81) 9');
  });

  it('é idempotente', () => {
    expect(formatarTelefone('(81) 99816-4466')).toBe('(81) 99816-4466');
  });
});

describe('formatarCEP', () => {
  it('formata o CEP completo', () => {
    expect(formatarCEP('54733200')).toBe('54733-200');
  });

  it('aceita entrada parcial e limita a 8 dígitos', () => {
    expect(formatarCEP('547')).toBe('547');
    expect(formatarCEP('54733')).toBe('54733');
    expect(formatarCEP('547332009999')).toBe('54733-200');
  });

  it('é idempotente', () => {
    expect(formatarCEP('54733-200')).toBe('54733-200');
  });
});

describe('funções de exibição', () => {
  it('não devolvem máscara pela metade quando o valor está vazio', () => {
    // Um "(" ou "-" solto na tela por causa de campo vazio e pior que nao mostrar nada.
    expect(exibirCPF('')).toBe('');
    expect(exibirTelefone('')).toBe('');
    expect(exibirCEP('')).toBe('');
    expect(exibirCPF(null)).toBe('');
    expect(exibirTelefone(undefined)).toBe('');
  });

  it('formatam quando o valor está completo', () => {
    expect(exibirCPF('71514710412')).toBe('715.147.104-12');
    expect(exibirTelefone('81998164466')).toBe('(81) 99816-4466');
    expect(exibirTelefone('8133334444')).toBe('(81) 3333-4444');
    expect(exibirCEP('54733200')).toBe('54733-200');
  });

  it('devolvem o valor original quando ele não tem o tamanho esperado', () => {
    // Dado legado ou incompleto aparece como esta, em vez de virar uma mascara errada.
    expect(exibirCPF('123')).toBe('123');
    expect(exibirTelefone('99999')).toBe('99999');
    expect(exibirCEP('547')).toBe('547');
  });
});

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(cpfValido('529.982.247-26')).toBe(false);
  });

  it('rejeita sequências de dígitos iguais', () => {
    // Passam na conta dos verificadores, mas nunca sao CPFs reais.
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('00000000000')).toBe(false);
  });

  it('rejeita tamanho diferente de 11 dígitos', () => {
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});
