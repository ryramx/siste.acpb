import { AuthenticatedUser, PermissionKey } from '../types/user';
import { apiClient } from './apiClient';
import { clearSession, setSession } from './session';

const USER_STORAGE_KEY = 'acpb_current_user';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MeResponse {
  id: number;
  pessoa_id: number;
  email: string;
  nome_completo: string;
  tem_foto: boolean;
  perfis: string[];
  permissoes: string[];
}

// Cada chave da UI mapeia para uma ou mais permissões reais do backend (modulo.acao).
// "view_dashboard" não tem permissão dedicada no backend: qualquer usuário autenticado acessa.
const REGRAS_DE_PERMISSAO: Record<PermissionKey, string[] | null> = {
  view_dashboard: null,
  view_members: ['membros.visualizar'],
  edit_members: ['membros.criar', 'membros.editar'],
  delete_members: ['membros.editar'],
  view_volunteers: ['voluntarios.visualizar'],
  edit_volunteers: ['voluntarios.criar', 'voluntarios.editar'],
  // Separada de edit_volunteers porque o PUT do backend exige `voluntarios.editar`: quem so
  // tem `voluntarios.criar` veria o botao de editar e tomaria 403 ao salvar.
  update_volunteers: ['voluntarios.editar'],
  view_beneficiaries: ['beneficiarios.visualizar'],
  edit_beneficiaries: ['beneficiarios.criar', 'beneficiarios.editar'],
  view_projects: ['projetos.visualizar'],
  edit_projects: ['projetos.criar', 'projetos.editar'],
  view_events: ['eventos.visualizar'],
  edit_events: ['eventos.criar', 'eventos.editar'],
  view_people: ['pessoas.visualizar'],
  view_financial: ['financeiro.visualizar'],
  edit_financial: ['financeiro.criar', 'financeiro.editar'],
  view_assets: ['patrimonio.visualizar'],
  edit_assets: ['patrimonio.criar', 'patrimonio.editar'],
  view_audit: ['auditoria.visualizar'],
  view_settings: ['usuarios.visualizar'],
  manage_users: ['usuarios.criar', 'usuarios.editar']
};

function toAuthenticatedUser(me: MeResponse): AuthenticatedUser {
  return {
    id: String(me.id),
    pessoaId: String(me.pessoa_id),
    email: me.email,
    name: me.nome_completo,
    temFoto: me.tem_foto,
    perfis: me.perfis,
    role: me.perfis[0] ?? 'Sem perfil',
    permissoes: me.permissoes
  };
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthenticatedUser> {
    const token = await apiClient.post<TokenResponse>('/auth/login', { email, senha });
    setSession(token.access_token, token.expires_in);

    try {
      const me = await apiClient.get<MeResponse>('/auth/me');
      const user = toAuthenticatedUser(me);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      clearSession();
      throw err;
    }
  },

  /** Confirma a recuperação com o token do e-mail e grava a nova senha.
   *
   * Não faz login em seguida de propósito: o token prova acesso à caixa de e-mail, não a
   * intenção de entrar agora. Quem trocou a senha volta ao login e usa a senha nova, o que
   * também confirma que ela foi de fato registrada. */
  async redefinirSenhaComToken(token: string, senhaNova: string): Promise<void> {
    await apiClient.post('/auth/redefinir-senha', { token, senha_nova: senhaNova });
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearSession();
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  },

  /** Rebusca `/auth/me` e sobrescreve o usuário em cache. Existe porque a sessão sobrevive a um
   * refresh de página só a partir do que foi salvo no `localStorage` no último login — se o RBAC
   * do usuário mudar no backend enquanto a aba continua aberta (ex.: um perfil foi vinculado a
   * ele por um administrador, ou o próprio usuário administra permissões nesta mesma tela), o
   * `AuthContext` precisa reconciliar isso, senão `hasPermission` fica preso nas permissões de
   * quando o usuário fez login pela última vez. */
  async refreshCurrentUser(): Promise<AuthenticatedUser> {
    const me = await apiClient.get<MeResponse>('/auth/me');
    const user = toAuthenticatedUser(me);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  getCurrentUser(): AuthenticatedUser | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      return null;
    }
  },

  saveCurrentUser(user: AuthenticatedUser): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  clearCurrentUser(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  hasPermission(permissoesDoUsuario: string[], permission: PermissionKey): boolean {
    const permissoesNecessarias = REGRAS_DE_PERMISSAO[permission];
    if (permissoesNecessarias === null) return true;
    return permissoesNecessarias.some((p) => permissoesDoUsuario.includes(p));
  }
};
