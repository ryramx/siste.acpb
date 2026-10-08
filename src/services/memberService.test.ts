import { afterEach, describe, expect, it, vi } from 'vitest';
import { memberService, NovoMembroInput } from './domainServices';
import { apiClient } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

const pessoaApi = {
  id: 7,
  nome_completo: 'Ana Lima',
  cpf: '52998224725',
  tem_foto: false
};

const membroApi = {
  id: 30,
  pessoa_id: 7,
  cargo_id: 2,
  data_entrada: '2026-10-08',
  data_saida: null,
  motivo_saida: null,
  ativo: true,
  observacoes: null,
  created_at: '',
  updated_at: ''
};

const dados: NovoMembroInput = {
  name: 'Ana Lima',
  cpf: '52998224725',
  rg: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  occupation: 'Professora',
  education: '',
  motherName: '',
  fatherName: '',
  guardianName: '',
  guardianPhone: '',
  phone: '',
  whatsapp: '',
  email: '',
  cep: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
  entryDate: '2026-10-08',
  cargoId: '2',
  notes: ''
};

describe('memberService.create com pessoa já cadastrada', () => {
  it('cria o membro sobre a pessoa existente em vez de criar outra', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ pessoa: pessoaApi, membro: membroApi });
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/membros/')) return membroApi as never;
      if (url.startsWith('/pessoas/')) return pessoaApi as never;
      if (url.startsWith('/cargos/')) return [] as never;
      return [] as never; // telefones
    });

    await memberService.create({ ...dados, pessoaId: '7' });

    expect(post).toHaveBeenCalledWith('/cadastros/pessoa-vinculo', {
      pessoa_id: 7,
      papel: 'membro',
      membro: { cargo_id: 2, data_entrada: '2026-10-08', ativo: true, observacoes: null }
    });
    // O que foi completado no formulário vai para o cadastro da pessoa.
    expect(put).toHaveBeenCalledWith('/pessoas/7', expect.objectContaining({ profissao: 'Professora' }));
  });

  it('não altera a pessoa quando o vínculo é recusado', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Esta pessoa já possui um vínculo'));
    const put = vi.spyOn(apiClient, 'put');

    await expect(memberService.create({ ...dados, pessoaId: '7' })).rejects.toThrow('vínculo');
    expect(put).not.toHaveBeenCalled();
  });
});

describe('memberService.listarPessoasSemMembro', () => {
  it('deixa de fora quem já é membro', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/membros/')) return [membroApi] as never;
      return [
        { id: 7, nome_completo: 'Ana Lima' },
        { id: 8, nome_completo: 'Bruno Reis' }
      ] as never;
    });

    expect(await memberService.listarPessoasSemMembro()).toEqual([{ id: '8', name: 'Bruno Reis' }]);
  });
});
