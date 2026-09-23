import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { comSessaoSalva, USUARIO_ADMIN } from '../../test/utils';
import { authService } from '../../services/authService';
import { PermissionKey } from '../../types/user';

/** Rota protegida e restauração de sessão.
 *
 * O bug que originou estes testes: recarregar a página deslogava o usuário mesmo com sessão
 * válida. O AuthContext restaura a sessão num efeito, que só roda depois do primeiro render;
 * a rota protegida decidia antes disso, via `user` ainda nulo e redirecionava para /login. Só
 * a navegação dentro do app funcionava — qualquer F5 ou link direto caía fora.
 *
 * O teste precisa de uma rota /login de verdade: sem ela o <Navigate> não tem para onde
 * levar, o conteúdo protegido acaba aparecendo assim que o efeito roda, e o teste passaria
 * igual com e sem o defeito. Foi o que aconteceu na primeira versão destes testes.
 */
function renderRotaProtegida(permission?: PermissionKey) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<p>Tela de login</p>} />
            <Route
              path="/protegida"
              element={
                <ProtectedRoute permission={permission}>
                  <p>Conteúdo protegido</p>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Evita que a reconciliação em segundo plano do AuthContext chame a API de verdade.
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(USUARIO_ADMIN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mantém o usuário dentro ao recarregar com sessão salva', async () => {
    comSessaoSalva();

    renderRotaProtegida();

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
  });

  it('nunca passa pela tela de login quando há sessão válida', async () => {
    comSessaoSalva();

    renderRotaProtegida();

    // O redirecionamento acontecia já no primeiro render, antes de a sessão ser restaurada.
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('sem sessão salva, manda para o login', async () => {
    renderRotaProtegida();

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('bloqueia quem tem sessão mas não tem a permissão exigida', async () => {
    const semFinanceiro = { ...USUARIO_ADMIN, permissoes: ['membros.visualizar'] };
    comSessaoSalva(semFinanceiro);
    vi.spyOn(authService, 'refreshCurrentUser').mockResolvedValue(semFinanceiro);

    renderRotaProtegida('edit_financial');

    expect(await screen.findByText(/Acesso Restrito/i)).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
    });
  });
});
