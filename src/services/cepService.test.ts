import { describe, it, expect, vi, afterEach } from 'vitest';
import { buscarEnderecoPorCEP, CEPError } from './cepService';

function mockFetch(resposta: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, ...resposta }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buscarEnderecoPorCEP', () => {
  it('mapeia a resposta do ViaCEP para o formato do formulário', async () => {
    mockFetch({
      json: async () => ({
        logradouro: 'Rua Rosa e Silva',
        bairro: 'Caiara',
        localidade: 'São Lourenço da Mata',
        uf: 'PE'
      })
    });

    await expect(buscarEnderecoPorCEP('54733-200')).resolves.toEqual({
      logradouro: 'Rua Rosa e Silva',
      bairro: 'Caiara',
      cidade: 'São Lourenço da Mata',
      estado: 'PE'
    });
  });

  it('consulta usando apenas os dígitos, aceitando o CEP com máscara', async () => {
    mockFetch({ json: async () => ({ localidade: 'Recife', uf: 'PE' }) });
    await buscarEnderecoPorCEP('54733-200');
    expect(fetch).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/54733200/json/',
      expect.anything()
    );
  });

  it('rejeita CEP com número de dígitos diferente de 8 sem chamar a rede', async () => {
    mockFetch({ json: async () => ({}) });
    await expect(buscarEnderecoPorCEP('547')).rejects.toThrow(CEPError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('trata CEP inexistente, que o ViaCEP devolve como 200 com {erro: true}', async () => {
    // O servico nao usa 404 nesse caso, entao a checagem precisa ser no corpo.
    mockFetch({ json: async () => ({ erro: true }) });
    await expect(buscarEnderecoPorCEP('99999999')).rejects.toThrow('CEP não encontrado');
  });

  it('trata a variante em que "erro" vem como string', async () => {
    mockFetch({ json: async () => ({ erro: 'true' }) });
    await expect(buscarEnderecoPorCEP('99999999')).rejects.toThrow('CEP não encontrado');
  });

  it('orienta o preenchimento manual quando a rede falha', async () => {
    // O cadastro nao pode depender de um servico externo: e conveniencia, nao requisito.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(buscarEnderecoPorCEP('54733200')).rejects.toThrow(
      'Preencha o endereço manualmente'
    );
  });

  it('orienta o preenchimento manual quando o serviço responde com erro HTTP', async () => {
    mockFetch({ ok: false, status: 500, json: async () => ({}) });
    await expect(buscarEnderecoPorCEP('54733200')).rejects.toThrow(
      'Preencha o endereço manualmente'
    );
  });

  it('devolve string vazia para os campos que o ViaCEP omitir', async () => {
    // CEPs de cidades pequenas costumam vir sem logradouro e sem bairro.
    mockFetch({ json: async () => ({ localidade: 'Bom Jardim', uf: 'PE' }) });
    await expect(buscarEnderecoPorCEP('55730000')).resolves.toEqual({
      logradouro: '',
      bairro: '',
      cidade: 'Bom Jardim',
      estado: 'PE'
    });
  });
});
