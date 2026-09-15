/** Sessão autenticada real (via API). A tela de administração de usuários (`SettingsPage`)
 * usa seus próprios tipos reais em `types/settings.ts` (`SystemUser`), não este. */
export interface AuthenticatedUser {
  id: string;
  pessoaId: string;
  email: string;
  name: string;
  /** Se a Pessoa por trás deste usuário tem foto cadastrada (ver Avatar/AvatarUpload). */
  temFoto: boolean;
  /** Nomes dos perfis (Administrador, Gestor, ...) vindos do backend. */
  perfis: string[];
  /** Primeiro perfil do usuário, só para rótulos/exibição (ex.: badge no Topbar). */
  role: string;
  /** Permissões granulares "modulo.acao" vindas do backend — fonte real de autorização. */
  permissoes: string[];
}

export type PermissionKey =
  | 'view_dashboard'
  | 'view_members'
  | 'edit_members'
  | 'delete_members'
  | 'view_volunteers'
  | 'edit_volunteers'
  | 'view_beneficiaries'
  | 'edit_beneficiaries'
  | 'view_projects'
  | 'edit_projects'
  | 'view_events'
  | 'edit_events'
  /** Cadastro de Pessoa em si (distinto de membros/voluntários/beneficiários).
   * Usada pelo relatório de pessoas, que exige `pessoas.visualizar` no backend. */
  | 'view_people'
  | 'view_financial'
  | 'edit_financial'
  /** Patrimônio: bens da associação (`patrimonio.*`). */
  | 'view_assets'
  | 'edit_assets'
  /** Consulta do histórico de auditoria (`auditoria.visualizar`). */
  | 'view_audit'
  | 'view_settings'
  | 'manage_users';
