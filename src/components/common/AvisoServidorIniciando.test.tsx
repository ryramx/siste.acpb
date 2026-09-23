import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AvisoServidorIniciando } from './AvisoServidorIniciando';
import { apiClient } from '../../services/apiClient';

const TEXTO = /O servidor está iniciando/i;

/** Aviso de servidor acordando.
 *
 * A API hiberna no plano gratuito e o primeiro acesso espera o serviço subir. A tela parada
 * por um minuto, sem nada escrito, parece travamento — mas não há erro, e recarregar só
 * reinicia a espera. O aviso existe para explicar, sem acusar falha.
 */
describe('AvisoServidorIniciando', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('não aparece enquanto nada está demorando', () => {
    render(<AvisoServidorIniciando />);
    expect(screen.queryByText(TEXTO)).not.toBeInTheDocument();
  });

  it('aparece quando a chamada passa do limiar e some quando ela responde', async () => {
    vi.useFakeTimers();
    let resolver: (r: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((res) => {
            resolver = res;
          })
      )
    );

    render(<AvisoServidorIniciando />);
    const promessa = apiClient.get('/lento');

    // Uma chamada comum termina muito antes do limiar: ninguém vê nada.
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.queryByText(TEXTO)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(TEXTO)).toBeInTheDocument();

    await act(async () => {
      resolver({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({})
      });
      await promessa;
    });

    expect(screen.queryByText(TEXTO)).not.toBeInTheDocument();
  });

  it('não bloqueia o que está embaixo dele', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})));

    render(<AvisoServidorIniciando />);
    apiClient.get('/lento');
    act(() => {
      vi.advanceTimersByTime(11000);
    });

    // É uma explicação, não um diálogo: não pode interceptar toque nem leitura da tela.
    const aviso = screen.getByRole('status');
    expect(aviso.className).toContain('pointer-events-none');
  });
});
