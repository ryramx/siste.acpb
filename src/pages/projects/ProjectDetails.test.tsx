import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectDetails } from './ProjectDetails';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { projectService, eventService, financialService } from '../../services/domainServices';
import { ApiError } from '../../services/apiClient';
import { Project } from '../../types/domain';
import { AuthenticatedUser } from '../../types/user';

const PROJETO: Project = {
  id: '1',
  name: 'Projeto Esperança',
  description: 'Reforço escolar',
  responsibleName: null,
  eventsCount: 0,
  totalExpenses: 0,
  status: 'ATIVO',
  startDate: null
};

/** Perfil que vê projetos mas não o financeiro, como Secretário, Coordenador e Voluntário. */
const USUARIO_SECRETARIO: AuthenticatedUser = {
  ...USUARIO_ADMIN,
  id: '2',
  perfis: ['Secretário'],
  role: 'Secretário',
  permissoes: ['projetos.visualizar', 'eventos.visualizar', 'pessoas.visualizar']
};

function renderDetalhes() {
  return render(
    <MemoryRouter initialEntries={['/projetos/1']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/projetos/:id" element={<ProjectDetails />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function comApiRespondendo() {
  vi.spyOn(projectService, 'getById').mockResolvedValue(PROJETO);
  vi.spyOn(projectService, 'getBeneficiaries').mockResolvedValue([]);
  vi.spyOn(projectService, 'getVolunteers').mockResolvedValue([]);
  vi.spyOn(eventService, 'getAll').mockResolvedValue([]);
}

/** Tela de detalhes do projeto.
 *
 * Origem destes testes: para quem não tem `financeiro.visualizar`, a busca das movimentações
 * voltava 403 e, sem catch, a tela ficava em "Carregando detalhes do projeto..." para sempre.
 */
describe('ProjectDetails', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('perfil sem acesso ao financeiro', () => {
    beforeEach(() => {
      comSessaoSalva(USUARIO_SECRETARIO);
      vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_SECRETARIO);
    });

    it('carrega o projeto sem pedir o financeiro', async () => {
      comApiRespondendo();
      const financeiro = vi
        .spyOn(financialService, 'getAll')
        .mockRejectedValue(new ApiError(403, 'Sem permissão'));

      renderDetalhes();

      expect(await screen.findByRole('heading', { name: 'Projeto Esperança' })).toBeInTheDocument();
      expect(financeiro).not.toHaveBeenCalled();
    });

    it('não mostra a aba nem o total de custos do financeiro', async () => {
      comApiRespondendo();

      renderDetalhes();

      await screen.findByRole('heading', { name: 'Projeto Esperança' });
      expect(screen.queryByRole('button', { name: /Financeiro/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Custos Totais')).not.toBeInTheDocument();
    });
  });

  describe('perfil com acesso ao financeiro', () => {
    beforeEach(() => {
      comSessaoSalva();
      vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_ADMIN);
    });

    it('mostra a aba e o total de custos', async () => {
      comApiRespondendo();
      vi.spyOn(financialService, 'getAll').mockResolvedValue([]);

      renderDetalhes();

      await screen.findByRole('heading', { name: 'Projeto Esperança' });
      expect(screen.getByRole('button', { name: /Financeiro \(0\)/ })).toBeInTheDocument();
      expect(screen.getByText('Custos Totais')).toBeInTheDocument();
    });

    it('não fica preso em "Carregando" quando a API falha, e "Tentar de novo" refaz a busca', async () => {
      comApiRespondendo();
      vi.spyOn(financialService, 'getAll').mockResolvedValue([]);
      const busca = vi
        .spyOn(projectService, 'getById')
        .mockRejectedValue(new ApiError(500, 'Erro interno do servidor'));

      renderDetalhes();

      expect(await screen.findByText(/Não foi possível carregar este projeto/i)).toBeInTheDocument();
      expect(screen.getByText('Erro interno do servidor')).toBeInTheDocument();
      expect(screen.queryByText(/Carregando detalhes/i)).not.toBeInTheDocument();

      busca.mockResolvedValue(PROJETO);
      await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));

      expect(await screen.findByRole('heading', { name: 'Projeto Esperança' })).toBeInTheDocument();
    });
  });
});
