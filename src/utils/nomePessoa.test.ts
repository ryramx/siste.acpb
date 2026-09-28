import { describe, it, expect } from 'vitest';
import { erroNomePessoa } from './nomePessoa';

describe('erroNomePessoa', () => {
  it('aceita nome de gente, com acento, hífen e apóstrofo', () => {
    for (const nome of ["Maria d'Ávila-Souza", 'José da Silva', 'Ana', 'Joana D’Arc', '  Ana  Lima ']) {
      expect(erroNomePessoa(nome)).toBeUndefined();
    }
  });

  it('recusa número, símbolo e nome curto', () => {
    expect(erroNomePessoa('123123123')).toMatch(/só pode ter letras/);
    expect(erroNomePessoa('João 2')).toMatch(/só pode ter letras/);
    expect(erroNomePessoa('Ana@Silva')).toMatch(/só pode ter letras/);
    expect(erroNomePessoa('Jo')).toMatch(/ao menos 3/);
  });

  it('deixa o campo em branco para o required decidir', () => {
    expect(erroNomePessoa('')).toBeUndefined();
    expect(erroNomePessoa(null)).toBeUndefined();
  });

  it('usa o nome do campo na mensagem', () => {
    expect(erroNomePessoa('Mãe 1', 'O nome da mãe')).toMatch(/^O nome da mãe/);
  });
});
