import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EventDetails } from './EventDetails';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { eventService } from '../../services/domainServices';
import { ApiError } from '../../services/apiClient';
import { EventItem } from '../../types/domain';

const EVENTO: EventItem = {
  id: '1',
  title: 'Aula de Jiu-Jitsu',
  description: 'Aula regular do projeto',
  date: '2026-09-05',
  time: '19:00:00',
  location: 'Sede ACPB',
  responsibleName: null,
  targetAudience: 'Participantes do projeto',
  maxSlots: 30,
  filledSlots: 1,
  requiresRegistration: true,
  status: 'AGENDADO'
};

function renderDetalhes() {
  return render(
    <MemoryRouter initialEntries={['/eventos/1']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/eventos/:id" element={<EventDetails />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Tela de detalhes do evento.
 *
 * Origem destes testes: uma inscrição gravada com status antigo fazia a API responder 500, e
 * a tela ficava presa em "Carregando evento..." para sempre — sem dizer nada. O efeito não
 * tinha catch, então a falha não tirava a tela do estado de carregamento nem aparecia.
 */
describe('EventDetails', () => {
  beforeEach(() => {
    comSessaoSalva();
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_ADMIN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra o evento quando a API responde', async () => {
    vi.spyOn(eventService, 'getById').mockResolvedValue(EVENTO);

    renderDetalhes();

    // Por papel: o título aparece duas vezes na tela (trilha de navegação e cabeçalho).
    expect(
      await screen.findByRole('heading', { name: 'Aula de Jiu-Jitsu' })
    ).toBeInTheDocument();
    expect(screen.getByText('Sede ACPB')).toBeInTheDocument();
  });

  it('não fica preso em "Carregando" quando a API falha', async () => {
    vi.spyOn(eventService, 'getById').mockRejectedValue(
      new ApiError(500, 'Erro interno do servidor')
    );

    renderDetalhes();

    expect(await screen.findByText(/Não foi possível carregar este evento/i)).toBeInTheDocument();
    expect(screen.queryByText(/Carregando evento/i)).not.toBeInTheDocument();
  });

  it('mostra o motivo vindo do servidor, não só uma falha genérica', async () => {
    vi.spyOn(eventService, 'getById').mockRejectedValue(
      new ApiError(500, 'Erro interno do servidor')
    );

    renderDetalhes();

    expect(await screen.findByText('Erro interno do servidor')).toBeInTheDocument();
  });

  it('"Tentar de novo" refaz a busca e carrega a tela', async () => {
    const busca = vi
      .spyOn(eventService, 'getById')
      .mockRejectedValueOnce(new ApiError(500, 'Erro interno do servidor'))
      .mockResolvedValueOnce(EVENTO);

    renderDetalhes();

    await userEvent.click(await screen.findByRole('button', { name: /Tentar de novo/i }));

    expect(
      await screen.findByRole('heading', { name: 'Aula de Jiu-Jitsu' })
    ).toBeInTheDocument();
    expect(busca).toHaveBeenCalledTimes(2);
  });

  it('oferece a exclusão para quem pode editar eventos', async () => {
    vi.spyOn(eventService, 'getById').mockResolvedValue(EVENTO);

    renderDetalhes();

    await userEvent.click(await screen.findByRole('button', { name: /Excluir evento/i }));

    // O aviso das inscrições é o que impede uma exclusão feita sem saber o efeito colateral.
    expect(await screen.findByText(/inscrição deste evento também será apagada/i)).toBeInTheDocument();
  });
});
