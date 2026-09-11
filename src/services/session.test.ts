import { describe, it, expect, beforeEach } from 'vitest';
import { getSession, setSession, clearSession } from './session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna null quando não há sessão salva', () => {
    expect(getSession()).toBeNull();
  });

  it('salva e recupera uma sessão válida', () => {
    setSession('token-abc', 3600);
    const sessao = getSession();
    expect(sessao?.accessToken).toBe('token-abc');
    expect(sessao?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('trata uma sessão expirada como ausente e limpa o storage', () => {
    setSession('token-expirado', -10); // expiresInSeconds negativo => já expirado
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('acpb_session')).toBeNull();
  });

  it('clearSession remove a sessão', () => {
    setSession('token-xyz', 3600);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it('ignora JSON corrompido no storage sem lançar erro', () => {
    localStorage.setItem('acpb_session', '{not-json');
    expect(getSession()).toBeNull();
  });
});
