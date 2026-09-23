import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { AuthenticatedUser } from '../types/user';

/** Usuário administrador de teste, com todos os perfis que o RBAC reconhece. */
export const USUARIO_ADMIN: AuthenticatedUser = {
  id: '1',
  pessoaId: '1',
  email: 'admin@acpb.local',
  name: 'Administrador de Teste',
  temFoto: false,
  perfis: ['Administrador'],
  role: 'Administrador',
  permissoes: [
    'eventos.visualizar',
    'eventos.criar',
    'eventos.editar',
    'membros.visualizar',
    'membros.criar',
    'membros.editar',
    'financeiro.visualizar',
    'financeiro.criar',
    'financeiro.editar'
  ]
};

/** Grava uma sessão válida no localStorage, como o login faria.
 *
 * É assim que se reproduz um F5: o app inicia com sessão gravada e precisa restaurá-la. */
export function comSessaoSalva(usuario: AuthenticatedUser = USUARIO_ADMIN): void {
  localStorage.setItem(
    'acpb_session',
    JSON.stringify({ accessToken: 'token-de-teste', expiresAt: Date.now() + 3_600_000 })
  );
  localStorage.setItem('acpb_current_user', JSON.stringify(usuario));
}

interface Opcoes extends Omit<RenderOptions, 'wrapper'> {
  rota?: string;
}

/** Renderiza com os provedores que as telas do sistema esperam. */
export function renderComProvedores(ui: React.ReactElement, { rota = '/', ...opcoes }: Opcoes = {}) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
    opcoes
  );
}
