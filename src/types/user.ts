export type UserRole = 'ADMINISTRADOR' | 'FINANCEIRO' | 'COORDENADOR' | 'VOLUNTARIO' | 'CONSULTA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
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
  | 'view_financial'
  | 'edit_financial'
  | 'view_settings'
  | 'manage_users';
