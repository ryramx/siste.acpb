import { describe, expect, it, vi, afterEach } from 'vitest';
import { auditService, buildAuditPath } from './auditService';
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

  it('expande data_fim ate o fim do dia', () => {
    // created_at e datetime: mandar so a data significaria meia-noite e
    // excluiria todo o ultimo dia escolhido pelo usuario.
    const path = buildAuditPath({ dataInicio: '2026-01-01', dataFim: '2026-01-31' });
    expect(path).toContain('data_inicio=2026-01-01T00%3A00%3A00');
    expect(path).toContain('data_fim=2026-01-31T23%3A59%3A59');
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
