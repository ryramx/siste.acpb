import { User } from '../types/user';

export const MOCK_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'João da Silva (Admin)',
    email: 'admin@acpb.local',
    role: 'ADMINISTRADOR',
    status: 'ATIVO',
    createdAt: '2025-01-10',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-2',
    name: 'Carlos Oliveira (Financeiro)',
    email: 'financeiro@acpb.local',
    role: 'FINANCEIRO',
    status: 'ATIVO',
    createdAt: '2025-02-01',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-3',
    name: 'Mariana Santos (Coordenadora)',
    email: 'coordenador@acpb.local',
    role: 'COORDENADOR',
    status: 'ATIVO',
    createdAt: '2025-02-15',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-4',
    name: 'Lucas Ferreira (Voluntário)',
    email: 'voluntario@acpb.local',
    role: 'VOLUNTARIO',
    status: 'ATIVO',
    createdAt: '2025-03-01',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-5',
    name: 'Fernanda Lima (Consulta)',
    email: 'consulta@acpb.local',
    role: 'CONSULTA',
    status: 'ATIVO',
    createdAt: '2025-03-10',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  }
];
