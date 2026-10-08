import { describe, expect, it, vi, afterEach } from 'vitest';
import { eventService, projectService } from './domainServices';
import { apiClient, ApiError } from './apiClient';

afterEach(() => {
  vi.restoreAllMocks();
});

const projeto = {
  id: 1,
  nome: 'Reforço Escolar',
  descricao: null,
  data_inicio: null,
  data_fim: null,
  status: 'ATIVO',
  responsavel_id: 5,
  orcamento: null,
  local: null,
  objetivos: null,
  observacoes: null
};

const evento = {
  id: 3,
  nome: 'Aula',
  descricao: null,
  data_evento: '2026-10-15',
  hora_inicio: '19:00:00',
  hora_fim: null,
  local: null,
  responsavel_id: 5,
  projeto_id: 1,
  limite_participantes: null,
  exige_inscricao: false,
  observacoes: null
};

describe('telas de projeto e evento para perfis que só enxergam parte dos dados', () => {
  it('Financeiro (sem eventos.visualizar) carrega a lista de projetos', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/projetos/') return [projeto] as never;
      if (url === '/pessoas/5') return { id: 5, nome_completo: 'Elisa' } as never;
      throw new ApiError(403, "Usuário não tem a permissão 'eventos.visualizar'");
    });

    const lista = await projectService.getAll();

    expect(lista).toHaveLength(1);
    expect(lista[0].responsibleName).toBe('Elisa');
  });

  it('Voluntário (sem pessoas.visualizar) vê a agenda, sem o nome do responsável', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/eventos/') return [evento] as never;
      throw new ApiError(403, "Usuário não tem a permissão 'pessoas.visualizar'");
    });

    const eventos = await eventService.getAll();

    expect(eventos).toHaveLength(1);
    expect(eventos[0].responsibleName).toBeNull();
    expect(eventos[0].time).toBe('19:00');
  });

  it('outros erros continuam derrubando a tela, para não esconder falha real', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/eventos/') return [evento] as never;
      throw new ApiError(500, 'Erro interno');
    });

    await expect(eventService.getAll()).rejects.toThrow('Erro interno');
  });
});
