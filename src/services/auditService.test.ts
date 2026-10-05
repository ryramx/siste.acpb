import { describe, expect, it, vi, afterEach } from 'vitest';
import { auditService, buildAuditPath, limiteDoDiaEmUtc } from './auditService';
import { apiClient, ApiError } from './apiClient';
import { userManagementService } from './settingsService';
import { SystemUser } from '../types/settings';

function usuario(id: string, name: string): SystemUser {
  return {
    id,
    pessoaId: id,
    name,
    email: `${name}@acpb.local`,
    ativo: true,
    protegido: false,
    perfis: [],
    ultimoLogin: null,
    createdAt: '2026-01-01T00:00:00'
  };
}

const registroApi = {
  id: 1,
  usuario_id: 7,
  acao: 'editar',
  tabela: 'usuarios',
  registro_id: 42,
  descricao: null,
  dados_anteriores: { ativo: true },
  dados_novos: { ativo: false },
  ip: '10.0.0.1',
  created_at: '2026-02-03T10:00:00'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildAuditPath', () => {
  it('usa limit e offset padrao quando nao informados', () => {
    expect(buildAuditPath()).toBe('/auditoria/?limit=50&offset=0');
  });

  it('omite filtros vazios', () => {
    const path = buildAuditPath({ tabela: '', acao: undefined });
    expect(path).not.toContain('tabela=');
    expect(path).not.toContain('acao=');
  });

  it('cobre o dia local inteiro, convertido para UTC', () => {
    // created_at e gravado em UTC sem fuso. Os limites precisam ser a meia-noite e o
    // ultimo instante do dia *local*, convertidos -- lidos de volta como UTC, tem que dar
    // exatamente esses instantes, em qualquer fuso em que o teste rode.
    const params = new URLSearchParams(
      buildAuditPath({ dataInicio: '2026-01-01', dataFim: '2026-01-31' }).split('?')[1]
    );
    const inicio = new Date(`${params.get('data_inicio')}Z`);
    const fim = new Date(`${params.get('data_fim')}Z`);
    expect(inicio.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    expect(fim.getTime()).toBe(new Date(2026, 0, 31, 23, 59, 59, 999).getTime());
    // Sem marca de fuso: a coluna nao tem fuso, e o backend compara direto.
    expect(params.get('data_inicio')).not.toMatch(/Z|[+-]\d{2}:\d{2}$/);
  });

  it('no Brasil, a noite de hoje entra no filtro de hoje', () => {
    // Em UTC-3 o dia local 05/10 vai de 03:00 UTC de 05/10 a 02:59 UTC de 06/10.
    // Em CI (UTC) os limites coincidem com o dia UTC e o teste so confere o formato.
    expect(limiteDoDiaEmUtc('2026-10-05', 'inicio')).toMatch(/^2026-10-05T\d{2}:00:00\.000$/);
    expect(limiteDoDiaEmUtc('2026-10-05', 'fim')).toMatch(/^2026-10-0[56]T\d{2}:59:59\.999$/);
  });

  it('repassa paginacao', () => {
    expect(buildAuditPath({ limit: 25, offset: 75 })).toContain('limit=25&offset=75');
  });
});

describe('auditService.list', () => {
  it('resolve o nome do usuario que executou a acao', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([registroApi]);
    vi.spyOn(userManagementService, 'getAll').mockResolvedValue([usuario('7', 'Maria')]);

    const [entrada] = await auditService.list();

    expect(entrada.usuarioNome).toBe('Maria');
    expect(entrada.dadosAnteriores).toEqual({ ativo: true });
    expect(entrada.dadosNovos).toEqual({ ativo: false });
  });

  it('cai para o id quando o usuario nao esta na lista', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([registroApi]);
    vi.spyOn(userManagementService, 'getAll').mockResolvedValue([usuario('99', 'Outro')]);

    const [entrada] = await auditService.list();
    expect(entrada.usuarioNome).toBe('Usuário #7');
  });

  it('rotula ator nulo como Sistema', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([{ ...registroApi, usuario_id: null }]);
    vi.spyOn(userManagementService, 'getAll').mockResolvedValue([]);

    const [entrada] = await auditService.list();
    expect(entrada.usuarioNome).toBe('Sistema');
    expect(entrada.usuarioId).toBeNull();
  });

  it('ainda lista a auditoria se o cadastro de usuarios falhar', async () => {
    // Sem os nomes a tela continua util; nao vale esconder a auditoria por isso.
    vi.spyOn(apiClient, 'get').mockResolvedValue([registroApi]);
    vi.spyOn(userManagementService, 'getAll').mockRejectedValue(new ApiError(403, 'Sem permissão'));

    const [entrada] = await auditService.list();
    expect(entrada.usuarioNome).toBe('Usuário #7');
  });

  it('propaga erro da propria auditoria (ex.: 403)', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError(403, 'Sem permissão'));
    vi.spyOn(userManagementService, 'getAll').mockResolvedValue([]);

    await expect(auditService.list()).rejects.toThrow('Sem permissão');
  });
});
