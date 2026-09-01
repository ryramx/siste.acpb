import { User, UserRole, PermissionKey } from '../types/user';
import { MOCK_USERS } from '../mocks/users';

const AUTH_STORAGE_KEY = 'acpb_auth_user';

const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMINISTRADOR: [
    'view_dashboard',
    'view_members',
    'edit_members',
    'delete_members',
    'view_volunteers',
    'edit_volunteers',
    'view_beneficiaries',
    'edit_beneficiaries',
    'view_projects',
    'edit_projects',
    'view_events',
    'edit_events',
    'view_financial',
    'edit_financial',
    'view_settings',
    'manage_users'
  ],
  FINANCEIRO: [
    'view_dashboard',
    'view_members',
    'view_volunteers',
    'view_beneficiaries',
    'view_projects',
    'view_events',
    'view_financial',
    'edit_financial'
  ],
  COORDENADOR: [
    'view_dashboard',
    'view_members',
    'edit_members',
    'view_volunteers',
    'edit_volunteers',
    'view_beneficiaries',
    'edit_beneficiaries',
    'view_projects',
    'edit_projects',
    'view_events',
    'edit_events'
  ],
  VOLUNTARIO: [
    'view_dashboard',
    'view_projects',
    'view_events',
    'edit_events'
  ],
  CONSULTA: [
    'view_dashboard',
    'view_members',
    'view_volunteers',
    'view_beneficiaries',
    'view_projects',
    'view_events',
    'view_financial'
  ]
};

export const authService = {
  async login(email: string): Promise<User> {
    // Simula delay de rede
    await new Promise((resolve) => setTimeout(resolve, 600));

    const foundUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!foundUser) {
      throw new Error('Credenciais inválidas. Verifique o e-mail informado.');
    }

    if (foundUser.status === 'INATIVO') {
      throw new Error('Este usuário está inativo. Fale com o administrador.');
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(foundUser));
    return foundUser;
  },

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) return MOCK_USERS[0]; // Retorna Admin por padrão se sem sessão salva
    try {
      return JSON.parse(data) as User;
    } catch {
      return MOCK_USERS[0];
    }
  },

  hasPermission(role: UserRole, permission: PermissionKey): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }
};
