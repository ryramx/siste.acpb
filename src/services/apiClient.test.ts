import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError, setOnUnauthorized } from './apiClient';
import { setSession, clearSession } from './session';

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response;
  const fakeResponse = {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => jsonBody,
    ...rest
  } as Response;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));
  return fakeResponse;
}

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setOnUnauthorized(null);
  });

  it('inclui o header Authorization quando há sessão ativa', async () => {
    setSession('meu-token', 3600);
    mockFetchOnce({ jsonBody: { ok: true } });

    await apiClient.get('/qualquer');

    const chamada = (fetch as any).mock.calls[0];
    const headers = chamada[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer meu-token');
  });

  it('não inclui Authorization quando não há sessão', async () => {
    mockFetchOnce({ jsonBody: { ok: true } });
    await apiClient.get('/qualquer');
    const chamada = (fetch as any).mock.calls[0];
    const headers = chamada[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('lança ApiError com a mensagem "detail" do backend em respostas de erro', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      jsonBody: { detail: 'CPF já cadastrado' }
    });

    await expect(apiClient.post('/pessoas/', {})).rejects.toMatchObject({
      status: 400,
      message: 'CPF já cadastrado'
    });
  });

  it('concatena mensagens de erro de validação do Pydantic (lista de objetos)', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      jsonBody: { detail: [{ msg: 'campo obrigatório' }, { msg: 'valor inválido' }] }
    });

    try {
      await apiClient.post('/pessoas/', {});
      throw new Error('deveria ter lançado ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe('campo obrigatório; valor inválido');
    }
  });

  it('em 401, limpa a sessão e chama o handler de não-autorizado', async () => {
    setSession('token-invalido', 3600);
    mockFetchOnce({ ok: false, status: 401, jsonBody: { detail: 'expirado' } });

    const handler = vi.fn();
    setOnUnauthorized(handler);

    await expect(apiClient.get('/protegido')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();

    // getSession deve retornar null pois a sessão foi limpa
    const { getSession } = await import('./session');
    expect(getSession()).toBeNull();
  });

  it('em 401 sem sessão (login), preserva a mensagem do servidor e não dispara o handler', async () => {
    // Credencial errada e sessão expirada chegavam as duas como 401 e eram tratadas igual,
    // então quem errava a senha via "Sessão expirada. Faça login novamente." sem nunca ter
    // entrado. Sem sessão, o 401 é do próprio login e a mensagem do servidor precisa passar.
    mockFetchOnce({
      ok: false,
      status: 401,
      jsonBody: { detail: 'Usuário ou senha incorretos' }
    });

    const handler = vi.fn();
    setOnUnauthorized(handler);

    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Usuário ou senha incorretos'
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('converte demora sem resposta em erro de conexão, em vez de ficar pendurado', async () => {
    // No celular, uma requisição feita ao perder o sinal não falha sozinha: fica pendurada e a
    // tela some no "Carregando..." para sempre.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('abortado', 'AbortError'))
    );

    await expect(apiClient.get('/lento')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('demorou demais')
    });
  });

  it('retorna undefined para respostas 204 sem corpo', async () => {
    mockFetchOnce({ ok: true, status: 204, jsonBody: undefined });
    const resultado = await apiClient.delete('/algo/1');
    expect(resultado).toBeUndefined();
  });

  it('postForm envia FormData sem definir Content-Type manualmente', async () => {
    setSession('meu-token', 3600);
    mockFetchOnce({ jsonBody: { ok: true } });

    const formData = new FormData();
    formData.append('arquivo', new Blob(['conteudo']), 'foto.png');
    await apiClient.postForm('/pessoas/1/foto', formData);

    const chamada = (fetch as any).mock.calls[0];
    expect(chamada[1].body).toBe(formData);
    expect(chamada[1].headers['Content-Type']).toBeUndefined();
    expect(chamada[1].headers['Authorization']).toBe('Bearer meu-token');
  });

  it('getBlob retorna o blob da resposta com header de autenticação', async () => {
    setSession('meu-token', 3600);
    const blobEsperado = new Blob(['dados-da-imagem']);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        blob: async () => blobEsperado
      } as unknown as Response)
    );

    const resultado = await apiClient.getBlob('/pessoas/1/foto');
    expect(resultado).toBe(blobEsperado);

    const chamada = (fetch as any).mock.calls[0];
    expect(chamada[1].headers['Authorization']).toBe('Bearer meu-token');
  });
});
