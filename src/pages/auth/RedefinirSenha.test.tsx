import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RedefinirSenha } from './RedefinirSenha';
import { authService } from '../../services/authService';

/** Esta tela nao existia: o e-mail de recuperacao mandava para `/redefinir-senha?token=...`,
 * o roteador nao conhecia a rota e o catch-all devolvia a pessoa ao login. Os testes abaixo
 * cobrem o caminho do link ate a senha gravada. */

/** Sem `delay`, `userEvent.type` espera entre cada tecla: as duas senhas deste arquivo somam
 * mais de 40 caracteres, e com a maquina carregada isso encostava no limite de tempo do
 * vitest -- o teste falhava por lentidao, nao por defeito. */
const digitar = () => userEvent.setup({ delay: null });

function renderComLink(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const LINK = '/redefinir-senha?token=abc123';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RedefinirSenha', () => {
  it('abre o formulario a partir do link do e-mail, sem exigir sessao', async () => {
    const usuario = digitar();
    renderComLink(LINK);

    expect(await screen.findByText('Criar nova senha')).toBeInTheDocument();
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
  });

  it('envia o token da URL junto da senha', async () => {
    const redefinir = vi
      .spyOn(authService, 'redefinirSenhaComToken')
      .mockResolvedValue(undefined);

    const usuario = digitar();
    renderComLink(LINK);
    await usuario.type(screen.getByLabelText(/^Nova senha/i), 'senhaforte1');
    await usuario.type(screen.getByLabelText(/^Repita a nova senha/i), 'senhaforte1');
    await usuario.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(redefinir).toHaveBeenCalledWith('abc123', 'senhaforte1');
    expect(await screen.findByText('Senha redefinida')).toBeInTheDocument();
  });

  it('recusa senha curta antes de chamar a API', async () => {
    const redefinir = vi.spyOn(authService, 'redefinirSenhaComToken');

    const usuario = digitar();
    renderComLink(LINK);
    await usuario.type(screen.getByLabelText(/^Nova senha/i), 'curta');
    await usuario.type(screen.getByLabelText(/^Repita a nova senha/i), 'curta');
    await usuario.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 8');
    expect(redefinir).not.toHaveBeenCalled();
  });

  it('recusa confirmacao diferente, porque o token so serve uma vez', async () => {
    // Um erro de digitacao aqui deixaria a pessoa trancada para fora com um token ja gasto.
    const redefinir = vi.spyOn(authService, 'redefinirSenhaComToken');

    const usuario = digitar();
    renderComLink(LINK);
    await usuario.type(screen.getByLabelText(/^Nova senha/i), 'senhaforte1');
    await usuario.type(screen.getByLabelText(/^Repita a nova senha/i), 'senhaforte2');
    await usuario.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não conferem');
    expect(redefinir).not.toHaveBeenCalled();
  });

  it('mostra o motivo quando o token esta expirado ou ja usado', async () => {
    vi.spyOn(authService, 'redefinirSenhaComToken').mockRejectedValue(
      new Error('Token de recuperação inválido, expirado ou já utilizado')
    );

    const usuario = digitar();
    renderComLink(LINK);
    await usuario.type(screen.getByLabelText(/^Nova senha/i), 'senhaforte1');
    await usuario.type(screen.getByLabelText(/^Repita a nova senha/i), 'senhaforte1');
    await usuario.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('expirado ou já utilizado');
  });

  it('explica o link sem token, em vez de mostrar um formulario que falharia', async () => {
    renderComLink('/redefinir-senha');

    expect(await screen.findByText('Link incompleto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar nova senha/i })).not.toBeInTheDocument();
  });
});
