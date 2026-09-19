import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userManagementService, profileService } from './settingsService';
import { ApiError, setOnUnauthorized } from './apiClient';
import { setSession } from './session';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body
  } as Response;
}

/** Mock de `fetch` que despacha por método + caminho, simulando várias rotas reais do backend
 * ao mesmo tempo (necessário porque os services fazem várias chamadas em paralelo). */
function mockBackend(handler: (method: string, path: string) => Response | undefined) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace('http://127.0.0.1:8001', '');
      const method = init?.method ?? 'GET';
      const response = handler(method, path);
      if (!response) {
        throw new Error(`Chamada inesperada no mock: ${method} ${path}`);
      }
      return response;
    })
  );
}

describe('settingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    setSession('token-de-teste', 3600);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setOnUnauthorized(null);
  });

  it('userManagementService.getAll monta os usuários reais com nome da Pessoa e perfis resolvidos', async () => {
    mockBackend((method, path) => {
      if (method === 'GET' && path === '/usuarios/') {
        return jsonResponse(200, [
          {
            id: 1,
            pessoa_id: 10,
            email: 'admin@acpb.local',
            ativo: true,
            ultimo_login: null,
            created_at: '2026-01-01T00:00:00',
            updated_at: '2026-01-01T00:00:00'
          }
        ]);
      }
      if (method === 'GET' && path === '/perfis/') {
        return jsonResponse(200, [
          { id: 5, nome: 'Administrador', descricao: 'Acesso total', ativo: true }
        ]);
      }
      if (method === 'GET' && path === '/pessoas/10') {
        return jsonResponse(200, { id: 10, nome_completo: 'Fulano de Tal' });
      }
      if (method === 'GET' && path === '/usuarios/1/perfis') {
        return jsonResponse(200, [{ id: 1, usuario_id: 1, perfil_id: 5 }]);
      }
      return undefined;
    });

    const usuarios = await userManagementService.getAll();

    expect(usuarios).toEqual([
      {
        id: '1',
        pessoaId: '10',
        name: 'Fulano de Tal',
        email: 'admin@acpb.local',
        ativo: true,
        perfis: [{ perfilId: '5', nome: 'Administrador' }],
        ultimoLogin: null,
        createdAt: '2026-01-01T00:00:00'
      }
    ]);
  });

  it('listarPessoasSemUsuario exclui pessoas que já têm um usuário vinculado', async () => {
    mockBackend((method, path) => {
      if (method === 'GET' && path === '/pessoas/') {
        return jsonResponse(200, [
          { id: 1, nome_completo: 'Já tem usuário' },
          { id: 2, nome_completo: 'Ainda não tem usuário' }
        ]);
      }
      if (method === 'GET' && path === '/usuarios/') {
        return jsonResponse(200, [
          { id: 99, pessoa_id: 1, email: 'x@x.com', ativo: true, ultimo_login: null, created_at: '', updated_at: '' }
        ]);
      }
      return undefined;
    });

    const disponiveis = await userManagementService.listarPessoasSemUsuario();
    expect(disponiveis).toEqual([{ id: '2', nome: 'Ainda não tem usuário' }]);
  });

  it('setAtivo(true) reativa via PUT /usuarios/{id} e setAtivo(false) usa o endpoint de desativação', async () => {
    const chamadas: { method: string; path: string; body?: string }[] = [];
    mockBackend((method, path) => {
      chamadas.push({ method, path });
      return jsonResponse(200, {});
    });

    await userManagementService.setAtivo('7', true);
    await userManagementService.setAtivo('7', false);

    expect(chamadas).toEqual([
      { method: 'PUT', path: '/usuarios/7' },
      { method: 'POST', path: '/usuarios/7/desativar' }
    ]);
  });

  it('vincularPerfil e desvincularPerfil chamam os endpoints corretos de usuario_perfis', async () => {
    const chamadas: string[] = [];
    mockBackend((method, path) => {
      chamadas.push(`${method} ${path}`);
      return jsonResponse(method === 'DELETE' ? 204 : 201, {});
    });

    await userManagementService.vincularPerfil('3', '5');
    await userManagementService.desvincularPerfil('3', '5');

    expect(chamadas).toEqual(['POST /usuarios/3/perfis/5', 'DELETE /usuarios/3/perfis/5']);
  });

  it('profileService.vincularPermissao e desvincularPermissao usam os endpoints de perfil_permissoes', async () => {
    const chamadas: string[] = [];
    mockBackend((method, path) => {
      chamadas.push(`${method} ${path}`);
      return jsonResponse(method === 'DELETE' ? 204 : 201, {});
    });

    await profileService.vincularPermissao('5', '12');
    await profileService.desvincularPermissao('5', '12');

    expect(chamadas).toEqual([
      'POST /perfis/5/permissoes/12',
      'DELETE /perfis/5/permissoes/12'
    ]);
  });

  it('propaga um 403 do backend (ex.: sem permissão usuarios.criar) como ApiError com status 403', async () => {
    mockBackend((method, path) => {
      if (method === 'POST' && path === '/usuarios/') {
        return jsonResponse(403, {
          detail: "Usuário não tem a permissão 'usuarios.criar' necessária para esta operação"
        });
      }
      return undefined;
    });

    await expect(
      userManagementService.create({ pessoaId: '1', email: 'a@a.com', senha: 'senhaForte123' })
    ).rejects.toMatchObject({
      status: 403,
      message: "Usuário não tem a permissão 'usuarios.criar' necessária para esta operação"
    });
  });

  it('propaga um 409 do backend (ex.: remover último administrador) como ApiError com status 409', async () => {
    mockBackend((method, path) => {
      if (method === 'DELETE' && path === '/usuarios/1/perfis/5') {
        return jsonResponse(409, {
          detail: 'Não é possível remover o último administrador ativo do sistema'
        });
      }
      return undefined;
    });

    await expect(userManagementService.desvincularPerfil('1', '5')).rejects.toBeInstanceOf(
      ApiError
    );
    await expect(userManagementService.desvincularPerfil('1', '5')).rejects.toMatchObject({
      status: 409
    });
  });
});
