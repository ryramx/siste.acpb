/** Perfil vinculado a um usuário do sistema, já resolvido com o nome do Perfil (não só o id). */
export interface UserProfileLink {
  perfilId: string;
  nome: string;
}

/** Usuário do sistema (tabela `usuarios`) para a tela de administração — dados reais da API,
 * nunca mockados (ver SettingsPage). */
export interface SystemUser {
  id: string;
  pessoaId: string;
  name: string;
  email: string;
  ativo: boolean;
  /** Conta principal do sistema: só ela mesma pode se alterar (ver backend
   * app/api/routes/usuarios.py). O backend recusa; a tela só evita oferecer o botão. */
  protegido: boolean;
  perfis: UserProfileLink[];
  ultimoLogin: string | null;
  createdAt: string;
}

/** Perfil de acesso (tabela `perfis`) — Administrador, Gestor, Secretário, Financeiro,
 * Coordenador, Voluntário (ver backend/RBAC.md). */
export interface SystemProfile {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

/** Permissão granular `modulo.acao` (tabela `permissoes`) — o backend continua sendo a
 * autoridade sobre o que cada uma efetivamente libera (ver backend/RBAC.md). */
export interface SystemPermission {
  id: string;
  nome: string;
  descricao: string | null;
  modulo: string;
  acao: string;
  ativo: boolean;
}

/** Pessoa disponível para virar um novo usuário do sistema (ainda sem `Usuario` vinculado). */
export interface PessoaSemUsuario {
  id: string;
  nome: string;
}
