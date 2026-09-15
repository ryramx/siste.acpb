import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildAssetPath, patrimonioService } from './patrimonioService';
import { apiClient, ApiError } from './apiClient';

const patrimonioApi = {
  id: 1,
  codigo: 'TOMB-001',
  nome: 'Notebook Dell',
  categoria: 'Informática',
  data_aquisicao: '2026-01-15',
  valor_aquisicao: '3500.00',
  local: 'Secretaria',
  responsavel_id: 9,
  status: 'ATIVO',
  observacoes: null
};

const pessoasApi = [{ id: 9, nome_completo: 'Maria Souza' }];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildAssetPath', () => {
  it('nao acrescenta query quando nao ha filtros', () => {
    expect(buildAssetPath()).toBe('/patrimonios/');
  });

  it('descarta filtros vazios', () => {
    expect(buildAssetPath({ categoria: '', status: '' })).toBe('/patrimonios/');
  });

  it('usa status_filtro, que e o nome esperado pelo backend', () => {
    // O backend nomeia assim para nao colidir com o modulo `status` do FastAPI.
    expect(buildAssetPath({ status: 'BAIXADO' })).toBe('/patrimonios/?status_filtro=BAIXADO');
  });

  it('combina varios filtros', () => {
    const path = buildAssetPath({ categoria: 'Instrumento', responsavelId: '9' });
    expect(path).toContain('categoria=Instrumento');
    expect(path).toContain('responsavel_id=9');
  });
});

describe('patrimonioService.getAll', () => {
  it('converte o numeric do backend para numero e resolve o responsavel', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((path: string) =>
      Promise.resolve(path.startsWith('/pessoas') ? pessoasApi : [patrimonioApi]) as never
    );

    const [bem] = await patrimonioService.getAll();

    // Numeric do Postgres chega como string; a UI precisa de numero para somar.
    expect(bem.valorAquisicao).toBe(3500);
    expect(bem.responsavelNome).toBe('Maria Souza');
    expect(bem.dataAquisicao).toBe('2026-01-15');
  });

  it('ainda lista os bens se o cadastro de pessoas falhar', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((path: string) =>
      path.startsWith('/pessoas')
        ? (Promise.reject(new ApiError(403, 'Sem permissão')) as never)
        : (Promise.resolve([patrimonioApi]) as never)
    );

    const [bem] = await patrimonioService.getAll();
    expect(bem.nome).toBe('Notebook Dell');
    expect(bem.responsavelNome).toBeNull();
  });

  it('trata valor e responsavel nulos', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((path: string) =>
      Promise.resolve(
        path.startsWith('/pessoas')
          ? []
          : [{ ...patrimonioApi, valor_aquisicao: null, responsavel_id: null }]
      ) as never
    );

    const [bem] = await patrimonioService.getAll();
    expect(bem.valorAquisicao).toBeNull();
    expect(bem.responsavelId).toBeNull();
  });
});

describe('patrimonioService.create', () => {
  it('envia o payload em snake_case e converte campos vazios para null', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(patrimonioApi);
    vi.spyOn(apiClient, 'get').mockResolvedValue(pessoasApi);

    await patrimonioService.create({
      codigo: 'TOMB-002',
      nome: 'Cadeira',
      categoria: 'Mobiliário',
      status: 'ATIVO',
      local: '',
      responsavelId: '',
      dataAquisicao: ''
    });

    expect(post).toHaveBeenCalledWith('/patrimonios/', {
      codigo: 'TOMB-002',
      nome: 'Cadeira',
      categoria: 'Mobiliário',
      data_aquisicao: null,
      valor_aquisicao: null,
      local: null,
      responsavel_id: null,
      status: 'ATIVO',
      observacoes: null
    });
  });

  it('propaga 409 de codigo duplicado', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(409, 'Já existe'));
    await expect(
      patrimonioService.create({ codigo: 'X', nome: 'Y', categoria: 'Z', status: 'ATIVO' })
    ).rejects.toThrow('Já existe');
  });
});
