import { describe, expect, it, vi, afterEach } from 'vitest';
import { NAO_INFORMADA, volunteerService } from './domainServices';
import { apiClient } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('volunteerService.update', () => {
  it('envia os tres campos da atuacao para o voluntario certo', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await volunteerService.update('7', {
      area: 'Saúde',
      skills: 'Psicologia, Libras',
      availability: 'Sábados à tarde'
    });

    expect(put).toHaveBeenCalledWith('/voluntarios/7', {
      area: 'Saúde',
      habilidades: 'Psicologia, Libras',
      disponibilidade: 'Sábados à tarde'
    });
  });

  it('grava null, e nao string vazia, para campo em branco', async () => {
    // O backend representa "nao informado" com null; "" faria a lista exibir um campo
    // vazio em vez de "Nao informada".
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await volunteerService.update('7', { area: '', skills: '   ', availability: undefined });

    expect(put).toHaveBeenCalledWith('/voluntarios/7', {
      area: null,
      habilidades: null,
      disponibilidade: null
    });
  });

  it('remove espacos das pontas', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({} as never);

    await volunteerService.update('7', { availability: '  Segundas à noite  ' });

    expect(put).toHaveBeenCalledWith(
      '/voluntarios/7',
      expect.objectContaining({ disponibilidade: 'Segundas à noite' })
    );
  });

  it('propaga o erro da API para a tela poder mostrar a mensagem', async () => {
    vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Sem permissão'));

    await expect(volunteerService.update('7', { area: 'Saúde' })).rejects.toThrow('Sem permissão');
  });
});

describe('NAO_INFORMADA', () => {
  it('e o texto que a lista exibe, e precisa ser reconhecido por quem edita', () => {
    // Se este texto mudar sem o modal de edicao acompanhar, abrir e salvar gravaria a
    // frase de exibicao como se fosse a disponibilidade real.
    expect(NAO_INFORMADA).toBe('Não informada');
  });
});
