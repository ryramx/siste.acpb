import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FinancialTabs } from './FinancialTabs';
import { AuthProvider } from '../../contexts/AuthContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { financialService } from '../../services/domainServices';

function renderEm(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <FinancialTabs />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** RQ-07: o período escolhido acompanha a troca de aba. */
describe('FinancialTabs', () => {
  beforeEach(() => {
    comSessaoSalva(USUARIO_ADMIN);
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_ADMIN);
    vi.spyOn(financialService, 'listarAnos').mockResolvedValue([2026, 2025]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('as abas levam o ano da URL', async () => {
    renderEm('/financeiro/receitas?ano=2025');
    const despesas = await screen.findByRole('link', { name: /Despesas/ });
    expect(despesas).toHaveAttribute('href', '/financeiro/despesas?ano=2025');
    expect(screen.getByLabelText('Ano')).toHaveValue('2025');
  });

  it('trocar o mês muda os links das abas', async () => {
    renderEm('/financeiro/receitas?ano=2026');
    await userEvent.selectOptions(await screen.findByLabelText('Mês'), '9');
    expect(screen.getByRole('link', { name: /Despesas/ })).toHaveAttribute(
      'href',
      '/financeiro/despesas?ano=2026&mes=9'
    );
  });

  it('sem nada na URL, fica no ano atual', async () => {
    renderEm('/financeiro');
    expect(await screen.findByLabelText('Ano')).toHaveValue(String(new Date().getFullYear()));
  });
});
