import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UsersManagement } from './UsersManagement';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { userManagementService, profileService } from '../../services/settingsService';
import { SystemUser, SystemProfile } from '../../types/settings';

const USUARIO: SystemUser = {
  id: '10',
  pessoaId: '20',
  name: 'Ryan Ramos',
  email: 'admin@acpb.local',
  ativo: true,
  perfis: [{ perfilId: '1', nome: 'Administrador' }],
  ultimoLogin: null,
  createdAt: '2026-01-01T00:00:00'
};

const PERFIS: SystemProfile[] = [
  { id: '1', nome: 'Administrador', descricao: '', ativo: true },
  { id: '2', nome: 'Gestor', descricao: '', ativo: true }
];

function renderTela() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <UsersManagement />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Edição de usuário.
 *
 * A tela tinha três botões por linha (perfis, senha, desativar) e nenhum deles permitia
 * corrigir o nome — que é o dado mais visível do usuário. No celular, os três ainda
 * empurravam a tabela para fora da largura da tela.
 */
describe('UsersManagement', () => {
  beforeEach(() => {
    // manage_users exige usuarios.criar + usuarios.editar; sem elas a coluna de ações some.
    const admin = {
      ...USUARIO_ADMIN,
      permissoes: [...USUARIO_ADMIN.permissoes, 'usuarios.visualizar', 'usuarios.criar', 'usuarios.editar']
    };
    comSessaoSalva(admin);
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(admin);
    vi.spyOn(userManagementService, 'getAll').mockResolvedValue([USUARIO]);
    vi.spyOn(profileService, 'getAll').mockResolvedValue(PERFIS);
    vi.spyOn(userManagementService, 'obterContextoDaPessoa').mockResolvedValue({
      temMembro: true,
      temVoluntario: false,
      temBeneficiario: false,
      contaTecnica: false
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('oferece uma única ação por linha', async () => {
    renderTela();
    const linha = (await screen.findByText('Ryan Ramos')).closest('tr')!;

    expect(within(linha).getAllByRole('button')).toHaveLength(1);
    expect(within(linha).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('abre o formulário com nome e e-mail atuais', async () => {
    renderTela();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByLabelText(/^Nome/)).toHaveValue('Ryan Ramos');
    expect(screen.getByLabelText(/^E-mail de acesso/)).toHaveValue('admin@acpb.local');
  });

  it('avisa que o nome é compartilhado com os outros cadastros da pessoa', async () => {
    renderTela();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(
      await screen.findByText(/também está cadastrada como membro/i)
    ).toBeInTheDocument();
  });

  it('salva só o que mudou', async () => {
    const salvar = vi.spyOn(userManagementService, 'atualizarDados').mockResolvedValue();

    renderTela();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    const campoNome = await screen.findByLabelText(/^Nome/);
    await userEvent.clear(campoNome);
    await userEvent.type(campoNome, 'Ryan Administrador');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar dados' }));

    // O e-mail não foi tocado, então não é reenviado.
    expect(salvar).toHaveBeenCalledWith('10', '20', { name: 'Ryan Administrador' });
  });

  it('não deixa salvar sem ter mudado nada', async () => {
    renderTela();
    await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));

    expect(await screen.findByRole('button', { name: 'Salvar dados' })).toBeDisabled();
  });
});
