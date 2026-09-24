import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { apiClient } from '../../services/apiClient';
import * as session from '../../services/session';

function Quebra(): React.ReactElement {
  throw new Error('campo inexistente em undefined');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('mostra a tela de erro em vez de apagar a pagina', () => {
    // React escreve o erro no console mesmo quando ele e capturado; silenciado para o teste
    // nao virar um muro de vermelho.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(session, 'getSession').mockReturnValue(null);

    render(
      <ErrorBoundary>
        <Quebra />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Algo quebrou nesta tela/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recarregar a tela/i })).toBeInTheDocument();
  });

  it('relata o erro ao backend, com a tela que quebrou', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(session, 'getSession').mockReturnValue({
      accessToken: 'token',
      expiresAt: Date.now() + 60000
    } as ReturnType<typeof session.getSession>);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);

    render(
      <ErrorBoundary>
        <Quebra />
      </ErrorBoundary>
    );

    expect(post).toHaveBeenCalledWith(
      '/monitoramento/erro-cliente',
      expect.objectContaining({ mensagem: 'campo inexistente em undefined' })
    );
  });

  it('nao tenta relatar sem sessao, porque a rota exige autenticacao', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(session, 'getSession').mockReturnValue(null);
    const post = vi.spyOn(apiClient, 'post');

    render(
      <ErrorBoundary>
        <Quebra />
      </ErrorBoundary>
    );

    expect(post).not.toHaveBeenCalled();
  });

  it('falha no relato nao derruba a tela de erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(session, 'getSession').mockReturnValue({
      accessToken: 'token',
      expiresAt: Date.now() + 60000
    } as ReturnType<typeof session.getSession>);
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('rede caiu'));

    render(
      <ErrorBoundary>
        <Quebra />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Algo quebrou nesta tela/i)).toBeInTheDocument();
  });

  it('deixa passar o conteudo quando nada quebra', () => {
    render(
      <ErrorBoundary>
        <p>tela normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('tela normal')).toBeInTheDocument();
  });
});
