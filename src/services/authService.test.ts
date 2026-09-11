import { describe, it, expect, vi, afterEach } from 'vitest';
import { authService } from './authService';
import { setSession } from './session';

describe('authService.refreshCurrentUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('rebusca /auth/me e sobrescreve o usuário em cache com as permissões atuais do backend', async () => {
    setSession('token-de-teste', 3600);
    // Cache antigo: usuário sem nenhuma permissão de "usuarios" (simula um perfil concedido
    // depois do último login, ou uma alteração feita na própria SettingsPage nesta mesma aba).
    localStorage.setItem(
      'acpb_current_user',
      JSON.stringify({
        id: '2',
        pessoaId: '2',
        email: 'admin@acpb.local',
        name: 'Admin',
        temFoto: false,
        perfis: ['Voluntário'],
        role: 'Voluntário',
        permissoes: ['eventos.visualizar']
      })
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 2,
          pessoa_id: 2,
          email: 'admin@acpb.local',
          nome_completo: 'Admin',
          tem_foto: false,
          perfis: ['Administrador'],
          permissoes: ['usuarios.visualizar', 'usuarios.criar', 'usuarios.editar']
        })
      })
    );

    const atualizado = await authService.refreshCurrentUser();

    expect(atualizado.perfis).toEqual(['Administrador']);
    expect(authService.hasPermission(atualizado.permissoes, 'manage_users')).toBe(true);

    // O cache em localStorage precisa refletir o resultado, não só o valor de retorno.
    const cacheado = authService.getCurrentUser();
    expect(cacheado?.perfis).toEqual(['Administrador']);
  });
});

describe('authService.hasPermission', () => {
  it('permite view_dashboard para qualquer usuário autenticado, mesmo sem permissões', () => {
    expect(authService.hasPermission([], 'view_dashboard')).toBe(true);
  });

  it('nega view_members quando o usuário não tem membros.visualizar', () => {
    expect(authService.hasPermission(['eventos.visualizar'], 'view_members')).toBe(false);
  });

  it('permite view_members quando o usuário tem membros.visualizar', () => {
    expect(authService.hasPermission(['membros.visualizar'], 'view_members')).toBe(true);
  });

  it('edit_members é concedido tanto por membros.criar quanto por membros.editar', () => {
    expect(authService.hasPermission(['membros.criar'], 'edit_members')).toBe(true);
    expect(authService.hasPermission(['membros.editar'], 'edit_members')).toBe(true);
    expect(authService.hasPermission(['membros.visualizar'], 'edit_members')).toBe(false);
  });

  it('manage_users exige usuarios.criar ou usuarios.editar', () => {
    expect(authService.hasPermission(['usuarios.visualizar'], 'manage_users')).toBe(false);
    expect(authService.hasPermission(['usuarios.editar'], 'manage_users')).toBe(true);
  });

  it('um administrador com todas as permissões reais tem acesso a tudo', () => {
    const todasPermissoes = [
      'pessoas.visualizar', 'pessoas.criar', 'pessoas.editar', 'pessoas.excluir',
      'membros.visualizar', 'membros.criar', 'membros.editar',
      'voluntarios.visualizar', 'voluntarios.criar', 'voluntarios.editar',
      'beneficiarios.visualizar', 'beneficiarios.criar', 'beneficiarios.editar',
      'projetos.visualizar', 'projetos.criar', 'projetos.editar',
      'eventos.visualizar', 'eventos.criar', 'eventos.editar',
      'inscricoes.visualizar', 'inscricoes.criar', 'inscricoes.editar',
      'financeiro.visualizar', 'financeiro.criar', 'financeiro.editar',
      'usuarios.visualizar', 'usuarios.criar', 'usuarios.editar',
      'auditoria.visualizar'
    ];
    const chaves: Parameters<typeof authService.hasPermission>[1][] = [
      'view_dashboard', 'view_members', 'edit_members', 'delete_members',
      'view_volunteers', 'edit_volunteers', 'view_beneficiaries', 'edit_beneficiaries',
      'view_projects', 'edit_projects', 'view_events', 'edit_events',
      'view_financial', 'edit_financial', 'view_settings', 'manage_users'
    ];
    for (const chave of chaves) {
      expect(authService.hasPermission(todasPermissoes, chave)).toBe(true);
    }
  });
});
