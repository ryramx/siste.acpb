import { apiClient } from './apiClient';
import {
  SystemUser,
  SystemProfile,
  SystemPermission,
  PessoaSemUsuario,
  UserProfileLink
} from '../types/settings';

interface ApiUsuario {
  id: number;
  pessoa_id: number;
  email: string;
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiPessoaResumo {
  id: number;
  nome_completo: string;
}

interface ApiUsuarioPerfil {
  id: number;
  usuario_id: number;
  perfil_id: number;
}

interface ApiPerfil {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface ApiPermissao {
  id: number;
  nome: string;
  descricao: string | null;
  modulo: string;
  acao: string;
  ativo: boolean;
}

async function carregarPerfis(): Promise<ApiPerfil[]> {
  return apiClient.get<ApiPerfil[]>('/perfis/');
}

async function resolverNomePessoa(
  pessoaId: number,
  cache: Map<number, string>
): Promise<string> {
  if (!cache.has(pessoaId)) {
    const pessoa = await apiClient.get<ApiPessoaResumo>(`/pessoas/${pessoaId}`);
    cache.set(pessoaId, pessoa.nome_completo);
  }
  return cache.get(pessoaId)!;
}

function toSystemUser(
  usuario: ApiUsuario,
  nomePessoa: string,
  vinculos: ApiUsuarioPerfil[],
  perfisPorId: Map<number, ApiPerfil>
): SystemUser {
  const perfis: UserProfileLink[] = vinculos
    .map((v) => perfisPorId.get(v.perfil_id))
    .filter((p): p is ApiPerfil => p !== undefined)
    .map((p) => ({ perfilId: String(p.id), nome: p.nome }));

  return {
    id: String(usuario.id),
    pessoaId: String(usuario.pessoa_id),
    name: nomePessoa,
    email: usuario.email,
    ativo: usuario.ativo,
    perfis,
    ultimoLogin: usuario.ultimo_login,
    createdAt: usuario.created_at
  };
}

function toSystemProfile(perfil: ApiPerfil): SystemProfile {
  return {
    id: String(perfil.id),
    nome: perfil.nome,
    descricao: perfil.descricao,
    ativo: perfil.ativo
  };
}

function toSystemPermission(permissao: ApiPermissao): SystemPermission {
  return {
    id: String(permissao.id),
    nome: permissao.nome,
    descricao: permissao.descricao,
    modulo: permissao.modulo,
    acao: permissao.acao,
    ativo: permissao.ativo
  };
}

/** Gerenciamento de usuários do sistema (login/senha), perfis vinculados e criação a partir
 * de uma Pessoa já cadastrada. Todos os endpoints já existiam no backend (ver `usuarios.py`). */
export const userManagementService = {
  async getAll(): Promise<SystemUser[]> {
    const [usuarios, perfis] = await Promise.all([
      apiClient.get<ApiUsuario[]>('/usuarios/'),
      carregarPerfis()
    ]);
    const perfisPorId = new Map(perfis.map((p) => [p.id, p]));
    const pessoasCache = new Map<number, string>();

    return Promise.all(
      usuarios.map(async (usuario) => {
        const [nomePessoa, vinculos] = await Promise.all([
          resolverNomePessoa(usuario.pessoa_id, pessoasCache),
          apiClient.get<ApiUsuarioPerfil[]>(`/usuarios/${usuario.id}/perfis`)
        ]);
        return toSystemUser(usuario, nomePessoa, vinculos, perfisPorId);
      })
    );
  },

  /** Pessoas já cadastradas que ainda não têm nenhum Usuario (login) vinculado — usado no
   * formulário de "Novo Usuário", já que `POST /usuarios/` exige um `pessoa_id` existente. */
  async listarPessoasSemUsuario(): Promise<PessoaSemUsuario[]> {
    const [pessoas, usuarios] = await Promise.all([
      apiClient.get<ApiPessoaResumo[]>('/pessoas/'),
      apiClient.get<ApiUsuario[]>('/usuarios/')
    ]);
    const comUsuario = new Set(usuarios.map((u) => u.pessoa_id));
    return pessoas
      .filter((p) => !comUsuario.has(p.id))
      .map((p) => ({ id: String(p.id), nome: p.nome_completo }));
  },

  async create(data: { pessoaId: string; email: string; senha: string }): Promise<void> {
    await apiClient.post('/usuarios/', {
      pessoa_id: Number(data.pessoaId),
      email: data.email,
      senha: data.senha
    });
  },

  /** Reflete o botão único de "Ativar/Desativar" da tela: desativação usa o endpoint dedicado
   * (preserva histórico, nunca exclui fisicamente); reativação é um PUT simples (`ativo: true`),
   * já que não existe (nem precisa existir) um endpoint dedicado de "reativar". */
  async setAtivo(usuarioId: string, ativo: boolean): Promise<void> {
    if (ativo) {
      await apiClient.put(`/usuarios/${usuarioId}`, { ativo: true });
    } else {
      await apiClient.post(`/usuarios/${usuarioId}/desativar`);
    }
  },

  /** Define uma senha provisória sem exigir a senha antiga — o caminho de volta para quem
   * esquece a senha, já que a recuperação por e-mail depende de um provedor externo. */
  async redefinirSenha(usuarioId: string, senhaNova: string): Promise<void> {
    await apiClient.post(`/usuarios/${usuarioId}/redefinir-senha`, { senha_nova: senhaNova });
  },

  async vincularPerfil(usuarioId: string, perfilId: string): Promise<void> {
    await apiClient.post(`/usuarios/${usuarioId}/perfis/${perfilId}`);
  },

  async desvincularPerfil(usuarioId: string, perfilId: string): Promise<void> {
    await apiClient.delete(`/usuarios/${usuarioId}/perfis/${perfilId}`);
  }
};

/** Gerenciamento de perfis de acesso e da matriz de permissões vinculadas a cada um. As regras
 * especiais do perfil Administrador (não desativar, não remover permissão) são aplicadas pelo
 * backend (`perfis.py`) — aqui apenas refletimos os erros 409 que ele já retorna. */
export const profileService = {
  async getAll(): Promise<SystemProfile[]> {
    const perfis = await carregarPerfis();
    return perfis.map(toSystemProfile);
  },

  async setAtivo(perfilId: string, ativo: boolean): Promise<void> {
    await apiClient.put(`/perfis/${perfilId}`, { ativo });
  },

  async listarPermissoesVinculadas(perfilId: string): Promise<Set<string>> {
    const vinculos = await apiClient.get<{ permissao_id: number }[]>(
      `/perfis/${perfilId}/permissoes`
    );
    return new Set(vinculos.map((v) => String(v.permissao_id)));
  },

  async vincularPermissao(perfilId: string, permissaoId: string): Promise<void> {
    await apiClient.post(`/perfis/${perfilId}/permissoes/${permissaoId}`);
  },

  async desvincularPermissao(perfilId: string, permissaoId: string): Promise<void> {
    await apiClient.delete(`/perfis/${perfilId}/permissoes/${permissaoId}`);
  }
};

/** Somente leitura: a matriz de permissões (`modulo.acao`) é definida e mantida pelo backend
 * (ver backend/RBAC.md) — o frontend nunca cria uma segunda fonte de verdade para ela. */
export const permissionService = {
  async getAll(): Promise<SystemPermission[]> {
    const permissoes = await apiClient.get<ApiPermissao[]>('/permissoes/');
    return permissoes.map(toSystemPermission);
  }
};
