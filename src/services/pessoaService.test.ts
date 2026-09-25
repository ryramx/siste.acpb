import { afterEach, describe, expect, it, vi } from 'vitest';
import { corpoDePessoa, pessoaService } from './pessoaService';
import { apiClient, ApiError } from './apiClient';

const pessoaApi = {
  id: 10,
  nome_completo: 'Maria Souza',
  cpf: '12345678901',
  rg: null,
  data_nascimento: '1990-05-02',
  sexo: 'F',
  email: 'maria@example.com',
  estado_civil: null,
  profissao: null,
  escolaridade: null,
  nome_mae: null,
  nome_pai: null,
  responsavel_nome: null,
  responsavel_telefone: null,
  endereco: null,
  bairro: null,
  cidade: 'São Lourenço da Mata',
  estado: 'PE',
  cep: null,
  tem_foto: false,
  conta_tecnica: false
};

const outraPessoaApi = { ...pessoaApi, id: 11, nome_completo: 'João Lima', cpf: null };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('corpoDePessoa', () => {
  it('manda null, nao string vazia, para os campos em branco', () => {
    // CPF vazio gravado como '' passaria pela unicidade na primeira pessoa e colidiria na
    // segunda; com null o Postgres nao considera duplicidade.
    const corpo = corpoDePessoa({ nomeCompleto: 'Ana', cpf: '', rg: '   ', cep: '' });
    expect(corpo.cpf).toBeNull();
    expect(corpo.rg).toBeNull();
    expect(corpo.cep).toBeNull();
  });

  it('guarda CPF, telefone e CEP so com digitos', () => {
    const corpo = corpoDePessoa({
      nomeCompleto: 'Ana',
      cpf: '123.456.789-01',
      cep: '54000-000',
      responsavelTelefone: '(81) 99999-8888'
    });
    expect(corpo.cpf).toBe('12345678901');
    expect(corpo.cep).toBe('54000000');
    expect(corpo.responsavel_telefone).toBe('81999998888');
  });

  it('remove espacos sobrando do nome', () => {
    expect(corpoDePessoa({ nomeCompleto: '  Ana Maria  ' }).nome_completo).toBe('Ana Maria');
  });
});

describe('pessoaService.listar', () => {
  it('marca os vinculos de cada pessoa a partir das listas dos modulos', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(((caminho: string) => {
      if (caminho === '/pessoas/') return Promise.resolve([pessoaApi, outraPessoaApi]);
      if (caminho === '/membros/') return Promise.resolve([{ pessoa_id: 10 }]);
      if (caminho === '/voluntarios/') return Promise.resolve([{ pessoa_id: 10 }]);
      if (caminho === '/beneficiarios/') return Promise.resolve([]);
      if (caminho === '/usuarios/') return Promise.resolve([{ pessoa_id: 11 }]);
      throw new Error(`caminho inesperado: ${caminho}`);
    }) as typeof apiClient.get);

    const { pessoas, vinculosCompletos } = await pessoaService.listar();

    const porId = (id: string) => pessoas.find((p) => p.id === id)!;
    expect(vinculosCompletos).toBe(true);
    expect(porId('10').vinculos).toEqual(['membro', 'voluntario']);
    expect(porId('11').vinculos).toEqual(['usuario']);
  });

  it('devolve as pessoas em ordem alfabetica, com acento ordenado junto da letra', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(((caminho: string) => {
      if (caminho === '/pessoas/')
        return Promise.resolve([
          { ...pessoaApi, id: 1, nome_completo: 'Zélia' },
          { ...pessoaApi, id: 2, nome_completo: 'Álvaro' },
          { ...pessoaApi, id: 3, nome_completo: 'Bruno' }
        ]);
      return Promise.resolve([]);
    }) as typeof apiClient.get);

    const { pessoas } = await pessoaService.listar();

    expect(pessoas.map((p) => p.nomeCompleto)).toEqual(['Álvaro', 'Bruno', 'Zélia']);
  });

  it('nao afirma "sem vinculo" quando uma lista foi negada por permissao', async () => {
    // Quem nao pode ver voluntarios nao deve concluir que ninguem e voluntario: a tela usa
    // esta flag para mostrar "—" em vez de "Sem vinculo".
    vi.spyOn(apiClient, 'get').mockImplementation(((caminho: string) => {
      if (caminho === '/pessoas/') return Promise.resolve([pessoaApi]);
      if (caminho === '/voluntarios/') return Promise.reject(new ApiError(403, 'Sem permissão'));
      return Promise.resolve([]);
    }) as typeof apiClient.get);

    const { pessoas, vinculosCompletos } = await pessoaService.listar();

    expect(vinculosCompletos).toBe(false);
    expect(pessoas[0].vinculos).toEqual([]);
  });

  it('traduz os campos do backend para os nomes da tela', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(((caminho: string) =>
      caminho === '/pessoas/' ? Promise.resolve([pessoaApi]) : Promise.resolve([])) as typeof apiClient.get);

    const { pessoas } = await pessoaService.listar();

    expect(pessoas[0]).toMatchObject({
      id: '10',
      nomeCompleto: 'Maria Souza',
      cpf: '12345678901',
      dataNascimento: '1990-05-02',
      cidade: 'São Lourenço da Mata',
      temFoto: false,
      contaTecnica: false
    });
  });

  it('propaga a falha quando a propria lista de pessoas nao carrega', async () => {
    // Aqui nao ha degradacao possivel: sem as pessoas nao ha tela.
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError(403, 'Sem permissão'));
    await expect(pessoaService.listar()).rejects.toThrow('Sem permissão');
  });
});

describe('pessoaService — escrita', () => {
  it('cria pela rota de pessoas', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(pessoaApi);
    await pessoaService.criar({ nomeCompleto: 'Maria Souza', cpf: '123.456.789-01' });
    expect(post).toHaveBeenCalledWith(
      '/pessoas/',
      expect.objectContaining({ nome_completo: 'Maria Souza', cpf: '12345678901' })
    );
  });

  it('atualiza pelo id', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue(pessoaApi);
    await pessoaService.atualizar('10', { nomeCompleto: 'Maria S. Souza' });
    expect(put).toHaveBeenCalledWith(
      '/pessoas/10',
      expect.objectContaining({ nome_completo: 'Maria S. Souza' })
    );
  });

  it('propaga o 409 de quem ainda tem vinculo', async () => {
    // O banco barra a exclusao enquanto houver registro dependente (RESTRICT) — a tela conta
    // com essa mensagem para explicar o que fazer.
    vi.spyOn(apiClient, 'delete').mockRejectedValue(
      new ApiError(409, 'Não é possível excluir devido a dependências')
    );
    await expect(pessoaService.excluir('10')).rejects.toThrow(/dependências/);
  });
});
