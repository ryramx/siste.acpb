import { getSession, clearSession } from './session';

/** URL da API, definida por ambiente em tempo de build (`VITE_API_URL`).
 *
 * O fallback só serve ao desenvolvimento local: um build de produção sem essa variável
 * apontaria para a máquina de quem compilou, e o sistema não carregaria nada para
 * ninguém. Por isso o build de produção falha explicitamente em vez de usar o fallback.
 */
const API_BASE_URL: string = (() => {
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) return configurada.replace(/\/$/, '');
  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL não definida no build de produção. Configure a variável de ambiente ' +
        'na plataforma de deploy (ver backend/DEPLOY.md) antes de gerar o build.'
    );
  }
  // Porta 8001 (e nao a 8000 padrao) para nao colidir com outro projeto rodando na
  // mesma maquina - ver a secao de desenvolvimento local em backend/DEPLOY.md.
  return 'http://127.0.0.1:8001';
})();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Chamado quando o backend recusa o token (401) — permite que o AuthContext reaja
 * (ex.: encerrar a sessão e redirecionar para o login). Registrado pela tarefa 27. */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  return headers;
}

async function extrairMensagemDeErro(response: Response): Promise<string> {
  const tipoConteudo = response.headers.get('content-type') ?? '';
  if (tipoConteudo.includes('application/json')) {
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') return data.detail;
      if (Array.isArray(data?.detail)) {
        // Erros de validação do FastAPI/Pydantic vêm como lista de objetos {loc, msg, ...}
        return data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join('; ');
      }
      return JSON.stringify(data);
    } catch {
      return `Erro HTTP ${response.status}`;
    }
  }
  return `Erro HTTP ${response.status}`;
}

/** Tempo-limite das chamadas. Sem ele, no celular uma requisição feita ao perder o sinal não
 * falha: fica pendurada indefinidamente, e a tela some no "Carregando..." para sempre. No
 * computador o navegador costuma cortar sozinho, e por isso o problema só aparecia no celular.
 * Uploads levam mais tempo por natureza, então têm folga maior. */
const TIMEOUT_PADRAO_MS = 15000;
const TIMEOUT_UPLOAD_MS = 60000;

async function fetchComTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw new ApiError(
        0,
        'O servidor demorou demais para responder. Verifique sua conexão e tente de novo.'
      );
    }
    throw new ApiError(0, 'Não foi possível falar com o servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timer);
  }
}

/** Trata a resposta comum a todas as chamadas.
 *
 * `tinhaSessao` distingue os dois 401 possiveis, que antes eram tratados como um só: com sessão,
 * o token expirou ou foi revogado e a mensagem é "Sessão expirada"; sem sessão, a chamada é de
 * login ou de recuperação de senha, e o 401 significa credencial errada -- dizer "Sessão
 * expirada" a quem nunca entrou é confuso e esconde o motivo real. */
async function tratarResposta<T>(response: Response, tinhaSessao: boolean): Promise<T> {
  if (response.status === 401 && tinhaSessao) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extrairMensagemDeErro(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const tipoConteudo = response.headers.get('content-type') ?? '';
  if (tipoConteudo.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const temCorpo = body !== undefined;
  const tinhaSessao = getSession() !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers: buildHeaders(temCorpo),
      body: temCorpo ? JSON.stringify(body) : undefined
    },
    TIMEOUT_PADRAO_MS
  );

  return tratarResposta<T>(response, tinhaSessao);
}

async function requestForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const session = getSession();
  if (session) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  // Sem Content-Type manual: o browser define o boundary do multipart/form-data sozinho.

  const tinhaSessao = session !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    { method, headers, body: formData },
    TIMEOUT_UPLOAD_MS
  );

  return tratarResposta<T>(response, tinhaSessao);
}

/** Busca um recurso binário (ex.: foto, comprovante) autenticado e retorna um Blob — usado
 * quando o elemento consumidor (ex.: <img>) não consegue enviar o header Authorization sozinho. */
async function requestBlob(path: string): Promise<Blob> {
  const tinhaSessao = getSession() !== null;
  const response = await fetchComTimeout(
    `${API_BASE_URL}${path}`,
    { headers: buildHeaders(false) },
    TIMEOUT_PADRAO_MS
  );

  if (response.status === 401 && tinhaSessao) {
    clearSession();
    onUnauthorized?.();
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }
  if (!response.ok) {
    throw new ApiError(response.status, await extrairMensagemDeErro(response));
  }
  return response.blob();
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
  postForm: <T>(path: string, formData: FormData): Promise<T> => requestForm<T>('POST', path, formData),
  getBlob: (path: string): Promise<Blob> => requestBlob(path)
};

